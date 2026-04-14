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

                if (csi.getClassSubject().getTeacher().getId().equals(teacher.getId())) {
                    result.add(csi);
                }
            }
        }

        return new Timetable(result);
    }

    public List<ClassSubjectInstance> createRandomInstances(
            List<ClassSubject> classSubjects,
            Room classRoom) {

        SchoolDays[] days = SchoolDays.values();
        Map<SchoolDays, List<Integer>> occupied = new HashMap<>();
        List<ClassSubjectInstance> result = new ArrayList<>();
        Random random = new Random();

        for (ClassSubject cs : classSubjects) {
            int hoursLeft = cs.getWeeklyHours();

            while (hoursLeft > 0) {
                SchoolDays day = days[random.nextInt(days.length)];
                int hour = random.nextInt(1, 9);
                int duration = random.nextInt(1, cs.getWeeklyHours() + 1);

                if (isFree(occupied, hour, duration, day)
                        && (hoursLeft - duration) >= 0) {

                    Period period = new Period(day, hour);

                    result.add(new ClassSubjectInstance(
                            cs, period, classRoom, duration));

                    reserve(occupied, hour, duration, day);

                    hoursLeft -= duration;
                }
            }
        }

        return result;
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

        for (SchoolClass sc : schoolClassRepository.getAll()) {
            List<ClassSubject> subjects = ClassSubject.getAllByClassName(sc.getClassName());
            List<ClassSubjectInstance> instances = createRandomInstances(subjects, sc.getClassRoom());
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
