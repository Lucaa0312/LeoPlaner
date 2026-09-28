package at.htlleonding.leoplaner.repository;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

import at.htlleonding.leoplaner.algorithm.Schedule;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import at.htlleonding.leoplaner.data.*;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

/**
 * Holds the school's Schedule and the timetables built from it.
 *
 * The Schedule is what the algorithm changes; the per class timetables are
 * views of it, rebuilt by publish(), so whoever reads them never sees a move
 * half done.
 */
@ApplicationScoped
public class TimetableService {

    private volatile Schedule schedule;
    private volatile int[] bestPositions;
    private volatile long bestCost;

    private volatile Timetable currentTimetable;
    private volatile Map<String, Timetable> currentTimetableList = new HashMap<>();
    private volatile Map<String, Timetable> bestSchoolSchedule;
    private List<History> historyList = new CopyOnWriteArrayList<>();
    // null until loaded; the algorithm thread reads it
    private volatile List<TeacherWishProfile> teacherWishProfiles;

    @Inject
    EntityManager entityManager;

    @Inject
    TeacherRepository teacherRepository;

    @Inject
    SchoolClassRepository schoolClassRepository;

    @Inject
    RoomRepository roomRepository;

    @Inject
    TeacherWishExtractor teacherWishExtractor;

    public List<History> getHistoryList() {
        return historyList;
    }

    public void addHistory(History history) {
        this.historyList.add(history);
    }

    public void setHistoryList(List<History> historyList) {
        this.historyList = historyList;
    }

    public void clear() {
        currentTimetable = null;
        currentTimetableList = new HashMap<>();
        schedule = null;
        bestPositions = null;
        bestSchoolSchedule = null;
    }

    public Schedule getSchedule() {
        return schedule;
    }

    /** Remembers the best schedule so far; its timetables are only built when asked for. */
    public void setBest(final int[] positions, final long cost) {
        bestPositions = positions;
        bestCost = cost;
        bestSchoolSchedule = null;
    }

    public Map<String, Timetable> getBestSchoolSchedule() {
        final Schedule current = schedule;
        final int[] positions = bestPositions;
        if (bestSchoolSchedule == null && current != null && positions != null) {
            bestSchoolSchedule = current.toTimetables(positions, bestCost);
        }
        return bestSchoolSchedule != null ? bestSchoolSchedule : new HashMap<>();
    }

    public void setBestSchoolSchedule(Map<String, Timetable> bestSchoolSchedule) {
        this.bestSchoolSchedule = bestSchoolSchedule;
    }

    /** Goes back to the best schedule found so far and continues from there. */
    public void loadBestSchedule() {
        final Schedule current = schedule;
        if (current != null && bestPositions != null) {
            current.restore(bestPositions);
            publish();
        }
    }

    /** Rebuilds the timetables everyone reads from the schedule as it is now. */
    public void publish() {
        final Schedule current = schedule;
        if (current != null) {
            currentTimetableList = current.toTimetables(current.snapshot(), current.getTotalCost());
        }
    }

    public void setCurrentTimetable(Timetable currentTimetable) {
        this.currentTimetable = currentTimetable;
    }

    public void setCurrentTimetableList(Map<String, Timetable> currentTimetableList) {
        this.currentTimetableList = currentTimetableList;
    }

    public EntityManager getEntityManager() {
        return entityManager;
    }

    public void setEntityManager(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public TeacherRepository getTeacherRepository() {
        return teacherRepository;
    }

    public void setTeacherRepository(TeacherRepository teacherRepository) {
        this.teacherRepository = teacherRepository;
    }

    public SchoolClassRepository getSchoolClassRepository() {
        return schoolClassRepository;
    }

    public void setSchoolClassRepository(SchoolClassRepository schoolClassRepository) {
        this.schoolClassRepository = schoolClassRepository;
    }

    public void clearHistory() {
        historyList.clear();
    }

    public Timetable getCurrentTimetable() {
        return currentTimetable;
    }

    public Map<String, Timetable> getCurrentTimetableList() {
        return currentTimetableList;
    }

    /** Each lesson once, even when it couples several classes. */
    public Timetable getTeacherTimetable(Long teacherId) {
        final Schedule current = schedule;
        final Teacher teacher = teacherRepository.getById(teacherId);
        if (current == null || teacher == null) {
            return new Timetable(new ArrayList<>());
        }
        return current.teacherTimetable(teacher, current.snapshot());
    }

    public Timetable getRoomTimetable(Long roomId) {
        final Schedule current = schedule;
        final Room room = roomRepository.getById(roomId);
        if (current == null || room == null) {
            return new Timetable(new ArrayList<>());
        }
        return current.roomTimetable(room, current.snapshot());
    }

    /**
     * Builds a fresh schedule for every lesson of the school and places it
     * with the constructive start, which is already free of clashes wherever
     * the data allows.
     */
    public void generateForAllClasses() {
        clear();

        teacherWishProfiles = loadTeacherWishProfiles();
        // before any lesson is cut: the split reads the flags this sets
        for (String problem : applyDoublePeriodWishes(teacherWishProfiles)) {
            System.out.println("Double period wish not applied: " + problem);
        }

        final Schedule created = Schedule.of(ClassSubject.getAllClassSubjects());
        // priced from the start, so the constructive start already weighs them;
        // rejected wishes are reported when the algorithm starts
        created.setWishes(SimulatedAnnealingAlgorithm.wishStateOf(teacherWishProfiles, new ArrayList<>()));
        created.construct(new Random());
        schedule = created;
        setBest(created.snapshot(), created.getTotalCost());
        publish();
    }

    public List<TeacherWishProfile> getTeacherWishProfiles() {
        return teacherWishProfiles;
    }

    public void setTeacherWishProfiles(List<TeacherWishProfile> teacherWishProfiles) {
        this.teacherWishProfiles = teacherWishProfiles;
    }

    /**
     * The AI's reading of the teachers' wishes, see TeacherWishExtractor.
     * Wishes are never worth failing a run over: anything going wrong means
     * no wishes.
     */
    public List<TeacherWishProfile> loadTeacherWishProfiles() {
        try {
            return teacherWishExtractor.extractAll();
        } catch (RuntimeException e) {
            System.out.println("Teacher wishes could not be extracted: " + e.getMessage());
            return List.of();
        }
    }

    /**
     * avoidDoublePeriod comes from wishes alone, so it is cleared first and a
     * withdrawn wish stops splitting the subject. isBetterDoublePeriod is left
     * alone, it can also be set by hand.
     *
     * Called from generateForAllClasses on this same bean; Quarkus intercepts
     * self-invocation of non-private methods, so the transaction still applies.
     */
    @Transactional
    public List<String> applyDoublePeriodWishes(List<TeacherWishProfile> profiles) {
        final List<ClassSubject> classSubjects = ClassSubject.getAllClassSubjects();
        for (ClassSubject cs : classSubjects) {
            cs.setAvoidDoublePeriod(false);
        }
        return DoublePeriodWishApplier.apply(profiles, classSubjects);
    }

    /** A schedule for one class on its own, other classes are not looked at. */
    public void generateForSingleClass(String className, Room room) {
        final Schedule single = Schedule.of(ClassSubject.getAllByClassName(className));
        single.construct(new Random());
        currentTimetable = single.toTimetables(single.snapshot(), single.getTotalCost())
                .values()
                .stream()
                .findFirst()
                .orElse(new Timetable(new ArrayList<>()));
    }
}
