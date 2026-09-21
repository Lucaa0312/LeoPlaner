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
            int hoursLeft = cs.getWeeklyHours();
            final Set<Long> teacherIds = teacherIdsOf(cs);
            int attempts = 0;

            while (hoursLeft > 0) {
                // never draw more hours than are left, otherwise most draws are
                // rejected and the loop can spin for a very long time
                int duration = random.nextInt(1, hoursLeft + 1);
                SchoolDays day = days[random.nextInt(days.length)];
                int hour = random.nextInt(
                        1, Math.max(2, LAST_REGULAR_HOUR - duration + 2));

                attempts++;
                // after a long streak of rejections the remaining slots are
                // most likely blocked by teachers; fall back to a class-legal
                // slot so generation always terminates. The cost function then
                // prices the clash in.
                final boolean ignoreTeachers = attempts > MAX_PLACEMENT_ATTEMPTS;

                if (isFree(occupied, hour, duration, day)
                        && (ignoreTeachers
                                || isTeacherFree(teacherBusy, teacherIds, hour, duration, day))) {

                    Period period = new Period(day, hour);

                    result.add(new ClassSubjectInstance(
                            cs, period, classRoom, duration));

                    reserve(occupied, hour, duration, day);
                    reserveTeachers(teacherBusy, teacherIds, hour, duration, day);

                    hoursLeft -= duration;
                    attempts = 0;
                }
            }
        }

        return result;
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
