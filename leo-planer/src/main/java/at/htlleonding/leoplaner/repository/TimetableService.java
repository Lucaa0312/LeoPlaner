package at.htlleonding.leoplaner.repository;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

import at.htlleonding.leoplaner.algorithm.Schedule;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import at.htlleonding.leoplaner.data.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;

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
    /** A schedule worth keeping: where every block sat and what that cost. */
    public record BestSchedule(int[] positions, long cost) {
    }

    private static final int BEST_SCHEDULES_KEPT = 3;
    /** the best schedules seen so far, cheapest first */
    private volatile List<BestSchedule> bestSchedules = List.of();

    private volatile Timetable currentTimetable;
    private volatile Map<String, Timetable> currentTimetableList = new HashMap<>();
    private volatile Map<String, Timetable> bestSchoolSchedule;
    private List<History> historyList = new CopyOnWriteArrayList<>();

    @Inject
    EntityManager entityManager;

    @Inject
    TeacherRepository teacherRepository;

    @Inject
    SchoolClassRepository schoolClassRepository;

    @Inject
    RoomRepository roomRepository;

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
        bestSchedules = List.of();
        bestSchoolSchedule = null;
    }

    public Schedule getSchedule() {
        return schedule;
    }

    /**
     * Offers a schedule to the best ones kept: it goes in where its cost puts
     * it and the most expensive one drops out. The timetables of the best are
     * only built when asked for.
     */
    public synchronized void setBest(final int[] positions, final long cost) {
        final List<BestSchedule> kept = new ArrayList<>(bestSchedules);
        int at = 0;
        for (final BestSchedule best : kept) {
            if (Arrays.equals(best.positions(), positions)) {
                return;
            }
            if (best.cost() <= cost) {
                at++;
            }
        }
        if (at >= BEST_SCHEDULES_KEPT) {
            return;
        }
        kept.add(at, new BestSchedule(positions, cost));
        if (kept.size() > BEST_SCHEDULES_KEPT) {
            kept.removeLast();
        }
        bestSchedules = List.copyOf(kept);
        if (at == 0) {
            bestSchoolSchedule = null;
        }
    }

    /** The best schedules seen so far, cheapest first. */
    public List<BestSchedule> getBestSchedules() {
        return bestSchedules;
    }

    public Map<String, Timetable> getBestSchoolSchedule() {
        final Schedule current = schedule;
        final List<BestSchedule> kept = bestSchedules;
        if (bestSchoolSchedule == null && current != null && !kept.isEmpty()) {
            bestSchoolSchedule = current.toTimetables(kept.getFirst().positions(), kept.getFirst().cost());
        }
        return bestSchoolSchedule != null ? bestSchoolSchedule : new HashMap<>();
    }

    public void setBestSchoolSchedule(Map<String, Timetable> bestSchoolSchedule) {
        this.bestSchoolSchedule = bestSchoolSchedule;
    }

    /** Goes back to the best schedule found so far and continues from there. */
    public void loadBestSchedule() {
        final Schedule current = schedule;
        final List<BestSchedule> kept = bestSchedules;
        if (current != null && !kept.isEmpty()) {
            current.restore(kept.getFirst().positions());
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
        final Schedule created = Schedule.of(ClassSubject.getAllClassSubjects());
        created.construct(new Random());
        schedule = created;
        setBest(created.snapshot(), created.getTotalCost());
        publish();
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
