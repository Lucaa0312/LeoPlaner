package at.htlleonding.leoplaner.repository;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import at.htlleonding.leoplaner.data.*;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class TimetableService {
    private static final int LAST_REGULAR_HOUR = 8;
    private static final int MAX_PLACEMENT_ATTEMPTS = 200;

    private Map<String, Timetable> bestSchoolSchedule = new HashMap<>();

    private Timetable currentTimetable;
    private Map<String, Timetable> currentTimetableList = new HashMap<>();
    private List<History> historyList = new CopyOnWriteArrayList<>();

    @Inject
    EntityManager entityManager;

    @Inject
    TeacherRepository teacherRepository;

    @Inject
    SchoolClassRepository schoolClassRepository;

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
        currentTimetableList.clear();
    }

    public Map<String, Timetable> getBestSchoolSchedule() {
        return bestSchoolSchedule;
    }

    public void setBestSchoolSchedule(Map<String, Timetable> bestSchoolSchedule) {
        this.bestSchoolSchedule = bestSchoolSchedule;
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

    public Timetable getTeacherTimetable(Long teacherId) {
        Teacher teacher = teacherRepository.getById(teacherId);
        List<ClassSubjectInstance> result = new ArrayList<>();

        for (Timetable timetable : currentTimetableList.values()) {
            for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {

                if (csi.getClassSubject() == null || csi.getPeriod().isLunchBreak()) {
                    continue;
                }

                if (csi.getClassSubject().getTeachers().stream()
                        .anyMatch(t -> t.getId().equals(teacher.getId()))) {
                    result.add(csi);
                }
            }
        }

        return new Timetable(result);
    }

    public List<ClassSubjectInstance> createRandomInstances(
            List<ClassSubject> classSubjects,
            Room classRoom) {

        return createRandomInstances(classSubjects, classRoom, new HashMap<>());
    }

    /**
     * teacherBusy is carried across classes so a teacher is not placed in two
     * classes at the same time while the starting schedule is built. The
     * annealing step can only keep a schedule legal, it cannot repair a start
     * that was already impossible.
     *
     * Lessons are appended to a day rather than dropped on a random hour: the
     * first repairTimetable compacts every day to run from the first hour
     * without gaps, so a lesson placed on hour 7 of an otherwise empty day ends
     * up on hour 1 anyway - and any check done against hour 7 was worthless.
     * Appending means the hour checked here is the hour the lesson keeps.
     *
     * Teacher non working hours are checked alongside the clashes. They cost
     * just as much, and a violation the start hands over is one the annealer
     * has to spend the whole run trying to undo.
     */
    public List<ClassSubjectInstance> createRandomInstances(
            List<ClassSubject> classSubjects,
            Room classRoom,
            Map<Long, Map<SchoolDays, Set<Integer>>> teacherBusy) {

        SchoolDays[] days = SchoolDays.schedulableDays();
        Map<SchoolDays, List<Integer>> occupied = new HashMap<>();
        List<ClassSubjectInstance> result = new ArrayList<>();
        Random random = new Random();

        for (ClassSubject cs : classSubjects) {
            final Deque<Integer> blocks = lessonBlocks(cs);
            final Set<Long> teacherIds = teacherIdsOf(cs);
            final List<Teacher> teachers = cs.getTeachers() == null
                    ? List.of()
                    : cs.getTeachers();
            int attempts = 0;

            while (!blocks.isEmpty()) {
                attempts++;

                // the constraints are given up one at a time the longer this
                // takes, so generation always terminates: first the hours the
                // teachers do not work, then the clashes, then the day length.
                // Whatever is left over the cost function prices in.
                final boolean ignoreNonWorking = attempts > MAX_PLACEMENT_ATTEMPTS;
                final boolean ignoreTeachers = attempts > 2 * MAX_PLACEMENT_ATTEMPTS;
                final boolean singleHoursOnly = attempts > 3 * MAX_PLACEMENT_ATTEMPTS;

                if (singleHoursOnly && blocks.peekFirst() > 1) {
                    // a double that fits nowhere is split rather than left out
                    final int hours = blocks.pollFirst();
                    for (int i = 0; i < hours; i++) {
                        blocks.addFirst(1);
                    }
                }

                final int duration = blocks.peekFirst();
                SchoolDays day = days[random.nextInt(days.length)];
                int hour = nextFreeHour(occupied, day);
                int lastAllowedHour = ignoreTeachers
                        ? TimetableManager.LAST_SCHOOL_HOUR
                        : LAST_REGULAR_HOUR;

                if (hour + duration - 1 > lastAllowedHour) {
                    continue; // day is full
                }

                if (!ignoreTeachers
                        && !isTeacherFree(teacherBusy, teacherIds, hour, duration, day)) {
                    continue;
                }

                if (!ignoreNonWorking
                        && !teachersAreWorking(teachers, hour, duration, day)) {
                    continue;
                }

                Period period = new Period(day, hour);

                result.add(new ClassSubjectInstance(
                        cs, period, classRoom, duration));

                reserve(occupied, hour, duration, day);
                reserveTeachers(teacherBusy, teacherIds, hour, duration, day);

                blocks.pollFirst();
                attempts = 0;
            }
        }

        return result;
    }

    /**
     * How a subject's weekly hours are cut into lessons: doubles for subjects
     * that need or prefer them (plus a single for an odd hour), single hours
     * for everything else.
     *
     * No move ever splits or merges a lesson, so whatever this returns is
     * what the whole run has to work with. Drawing the lengths at random used
     * to turn a four hour subject into one four hour block a quarter of the
     * time, left DOUBLE_PERIOD a constant the annealer could not touch, and
     * never looked at requiresDoublePeriod at all.
     */
    static Deque<Integer> lessonBlocks(ClassSubject cs) {
        final Deque<Integer> blocks = new ArrayDeque<>();
        final int hours = Math.max(0, cs.getWeeklyHours());

        if (cs.isRequiresDoublePeriod() || cs.isBetterDoublePeriod()) {
            // doubles first: they are the harder ones to fit
            for (int i = 0; i < hours / 2; i++) {
                blocks.add(2);
            }
            if (hours % 2 == 1) {
                blocks.add(1);
            }
            return blocks;
        }

        for (int i = 0; i < hours; i++) {
            blocks.add(1);
        }
        return blocks;
    }

    /**
     * The hour a lesson appended to this day would start on. Days are filled
     * from the first hour without gaps, so this is just how much is on the day
     * already.
     */
    private int nextFreeHour(Map<SchoolDays, List<Integer>> occupied, SchoolDays day) {
        return TimetableManager.FIRST_SCHOOL_HOUR
                + occupied.getOrDefault(day, List.of()).size();
    }

    /** False as soon as one teacher of the lesson does not work on one of its hours. */
    private boolean teachersAreWorking(List<Teacher> teachers,
            int hour, int duration, SchoolDays day) {

        for (Teacher teacher : teachers) {
            if (teacher == null) {
                continue;
            }

            for (int i = 0; i < duration; i++) {
                final TeacherNonWorkingHours nonWorking = new TeacherNonWorkingHours();
                nonWorking.setDay(day);
                nonWorking.setSchoolHour(hour + i);

                if (teacher.checkIfHourExistsInNonWorkingList(nonWorking)) {
                    return false;
                }
            }
        }
        return true;
    }

    private static Set<Long> teacherIdsOf(ClassSubject cs) {
        if (cs == null || cs.getTeachers() == null) {
            return Set.of();
        }

        Set<Long> ids = new HashSet<>();
        for (Teacher teacher : cs.getTeachers()) {
            if (teacher != null && teacher.getId() != null) {
                ids.add(teacher.getId());
            }
        }
        return ids;
    }

    private boolean isTeacherFree(Map<Long, Map<SchoolDays, Set<Integer>>> teacherBusy,
            Set<Long> teacherIds, int hour, int duration, SchoolDays day) {

        for (Long teacherId : teacherIds) {
            Set<Integer> busyHours = teacherBusy
                    .getOrDefault(teacherId, Map.of())
                    .getOrDefault(day, Set.of());

            for (int i = 0; i < duration; i++) {
                if (busyHours.contains(hour + i)) {
                    return false;
                }
            }
        }
        return true;
    }

    private void reserveTeachers(Map<Long, Map<SchoolDays, Set<Integer>>> teacherBusy,
            Set<Long> teacherIds, int hour, int duration, SchoolDays day) {

        for (Long teacherId : teacherIds) {
            Set<Integer> busyHours = teacherBusy
                    .computeIfAbsent(teacherId, id -> new HashMap<>())
                    .computeIfAbsent(day, d -> new HashSet<>());

            for (int i = 0; i < duration; i++) {
                busyHours.add(hour + i);
            }
        }
    }

    private boolean isFree(Map<SchoolDays, List<Integer>> occupied,
            int hour, int duration, SchoolDays day) {

        List<Integer> list = occupied.get(day);
        if (list == null)
            return true;

        for (int i = 0; i < duration; i++) {
            if (list.contains(hour + i))
                return false;
        }
        return true;
    }

    private void reserve(Map<SchoolDays, List<Integer>> occupied,
            int hour, int duration, SchoolDays day) {

        List<Integer> list = occupied.getOrDefault(day, new ArrayList<>());

        for (int i = 0; i < duration; i++) {
            list.add(hour + i);
        }

        occupied.put(day, list);
    }

    public void generateForAllClasses() {
        clear();

        // shared across every class so the generated start is already free of
        // teacher clashes
        final Map<Long, Map<SchoolDays, Set<Integer>>> teacherBusy = new HashMap<>();

        for (SchoolClass sc : schoolClassRepository.getAll()) {
            List<ClassSubject> subjects = ClassSubject.getAllByClassName(sc.getClassName());
            List<ClassSubjectInstance> instances = createRandomInstances(subjects, sc.getClassRoom(),
                    teacherBusy);
            addClassSubjectInstances(instances);
            Timetable timetable = new Timetable(instances, sc);
            currentTimetableList.put(sc.getClassName(), timetable);
        }
    }

    public void addClassSubjectInstances(List<ClassSubjectInstance> csis) {
        for (ClassSubjectInstance csi : csis) {
            addClassSubjectInstance(csi);
        }
    }

    @Transactional
    public void addClassSubjectInstance(ClassSubjectInstance csi) {
        this.entityManager.persist(csi);
    }

    public void generateForSingleClass(String className, Room room) {
        List<ClassSubject> subjects = ClassSubject.getAllByClassName(className);
        List<ClassSubjectInstance> instances = createRandomInstances(subjects, room);
        currentTimetable = new Timetable(instances);
    }
}
