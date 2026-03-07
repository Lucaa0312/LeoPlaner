package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DataRepository {
    private Timetable currentTimetable; // volatile, algorithms keep updating this value at the moment
    private Map<String, Timetable> currentTimetableList = new HashMap<>(); // key = className, value = timetable
    private List<History> historyList = new ArrayList<>();

    @Inject
    EntityManager entityManager;

    public List<History> getHistoryList() {
        return historyList;
    }

    public void setHistoryList(final List<History> historyList) {
        this.historyList = historyList;
    }

    public void clearTimetableData() {
        this.currentTimetableList = new HashMap<>();
        this.currentTimetable = null;
    }

    public Timetable getCurrentTimetable() {
        return this.currentTimetable;
    }

    public Timetable getCurrentSortedBySchoolhourTimetable() {
        this.currentTimetable.sortTimetableBySchoolhour();
        return this.currentTimetable;
    }

    public void setCurrentTimetable(final Timetable currentTimetable) {
        this.currentTimetable = currentTimetable;
    }

    public Map<String, Timetable> getCurrentTimetableList() {
        return currentTimetableList;
    }

    public void setCurrentTimetableList(final Map<String, Timetable> currentTimetableList) {
        this.currentTimetableList = currentTimetableList;
    }

    public Timetable getCurrentTeacherTimetableSingleClass(final Long id) {
        this.currentTimetable.sortTimetableBySchoolhour();
        final Teacher teacher = getTeacherByID(id);
        return new Timetable(this.currentTimetable.getClassSubjectInstances().stream()
                .filter(e -> e.getClassSubject() != null
                        && e.getClassSubject().getTeacher().getId().equals(teacher.getId()))
                .toList());
    }

    public Timetable getCurrentTeacherTimetable(final Long id) {
        final Teacher teacher = getTeacherByID(id);
        final List<ClassSubjectInstance> teacherTakenClasses = new ArrayList<>();

        for (final Timetable timetable : this.currentTimetableList.values()) {
            for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                if (csi.getClassSubject() == null || csi.getPeriod().isLunchBreak()) {
                    continue;
                }
                if (csi.getClassSubject().getTeacher().getId().equals(teacher.getId())) {
                    teacherTakenClasses.add(csi);
                }
            }
        }
        return new Timetable(teacherTakenClasses);
    }

    public List<ClassSubject> getAllClassSubjects() {
        return ClassSubject.getAllClassSubjects();
    }

    public List<ClassSubject> getAllClassSubjectsWithClass(final String className) {
        return ClassSubject.getAllByClassName(className);
    }

    public List<Teacher> getAllTeachers() {
        return Teacher.getAllTeachers();
    }

    public Teacher getTeacherByID(final Long id) {
        return Teacher.getById(id);
    }

    public Long getTeacherCount() {
        return Teacher.getCountOfAllTeachers();
    }

    public Teacher getTeacherByNameAndCheckIfExists(final String teacherName) {
        return Teacher.getFirstByName(teacherName);
    }

    public List<Room> getAllRooms() {
        return Room.getAllRooms();
    }

    public Room getRoomByID(final Long id) {
        return Room.getById(id);
    }

    public Room getRandomRoom() {
        return Room.getRandomRoom();
    }

    public Room getRoomByNumberName(final String numberName) {
        return Room.getByNumberAndName(numberName);
    }

    public Room getRoomByNumber(final int number) {
        return Room.getByNumber(number);
    }

    public Room getRoomByName(final String name) {
        return Room.getByName(name);
    }

    public Long getRoomCount() {
        return Room.getCountOfAllRooms();
    }

    public SchoolClass checkIfSchoolClassExists(final String className) {
        return SchoolClass.getFirstByName(className);
    }

    public SchoolClass getSchoolClassById(final Long id) {
        return SchoolClass.getById(id);
    }

    public List<SchoolClass> getAllSchoolClasses() {
        return SchoolClass.getAllSchoolClasss();
    }

    public List<Subject> getAllSubjects() {
        return Subject.getAllSubjects();
    }

    public Subject getSubjectByName(final String name) {
        return Subject.getFirstByName(name);
    }

    public Long getSubjectCount() {
        return Subject.getCountOfAllSubjects();
    }

    public Subject getSubjectByNameAndCheckIfExists(final String subjectName) {
        Subject subject;
        try {
            subject = getSubjectByName(subjectName);
        } catch (final Exception e) {
            return null;
        }
        return subject;
    }

    @Transactional
    public ClassSubject addClassSubject(final ClassSubject classSubject) { // TODO correct return type???
        if (this.entityManager.contains(classSubject)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(classSubject);
        return classSubject;
    }

    @Transactional
    public ClassSubjectInstance addClassSubjectInstance(final ClassSubjectInstance classSubjectInstance) {
        if (this.entityManager.contains(classSubjectInstance)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(classSubjectInstance);
        return classSubjectInstance;
    }

    @Transactional
    public Timetable addTimetable(final Timetable timetable) {
        if (this.entityManager.contains(timetable)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(timetable);
        return timetable;
    }

    @Transactional
    public SchoolClass addSchoolClass(final SchoolClass schoolClass) {
        if (this.entityManager.contains(schoolClass)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(schoolClass);
        return schoolClass;
    }

    @Transactional
    public Teacher addTeacher(final Teacher teacher) {
        if (this.entityManager.contains(teacher)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(teacher);
        return teacher;
    }

    @Transactional
    public Teacher updateTeacher(Long id, Teacher teacher) {
        Teacher teacherToUpdate = Teacher.getById(id);

        teacherToUpdate.setNameSymbol(teacher.getNameSymbol());
        teacherToUpdate.setTeacherName(teacher.getTeacherName());
        teacherToUpdate.setTakenUpPeriods(teacher.getTakenUpPeriods());
        teacherToUpdate.setTeacher_non_preferred_hours(teacher.getTeacher_non_preferred_hours());
        teacherToUpdate.setTeacher_non_working_hours(teacher.getTeacher_non_working_hours());
        teacherToUpdate.setTeachingSubject(teacher.getTeachingSubject());

        return teacherToUpdate;
    }

    @Transactional
    public Room updateRoom(Long id, Room room) {
        Room roomToUpdate = Room.getById(id);

        roomToUpdate.setNameShort(room.getNameShort());
        roomToUpdate.setRoomNumber(room.getRoomNumber());
        roomToUpdate.setRoomName(room.getRoomName());
        roomToUpdate.setRoomTypes(room.getRoomTypes());

        return roomToUpdate;
    }

    @Transactional
    public Subject updateSubject(Long id, Subject subject) {
        Subject subjectToUpdate = Subject.getById(id);

        subjectToUpdate.setSubjectName(subject.getSubjectName());
        subjectToUpdate.setSubjectColor(subject.getSubjectColor());
        subjectToUpdate.setRequiredRoomTypes(subject.getRequiredRoomTypes());

        return subjectToUpdate;
    }

    @Transactional
    public Room addRoom(final Room room) {
        if (this.entityManager.contains(room)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(room);
        return room;
    }

    @Transactional
    public Subject addSubject(final Subject subject) {
        if (this.entityManager.contains(subject)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(subject);
        return subject;
    }

    public ArrayList<ClassSubjectInstance> createRandomClassSubjectInstances(final List<ClassSubject> classSubjects,
            final Room classRoom) {
        // List<Room> getAllRooms = getAllRooms(); //TODO add special rooms
        final SchoolDays[] schoolDays = SchoolDays.values();
        final HashMap<SchoolDays, ArrayList<Integer>> occupiedHours = new HashMap<>();
        final ArrayList<ClassSubjectInstance> result = new ArrayList<>();
        final Random random = new Random();
        final int MAX_HOUR = 9;
        final int MIN_HOUR = 1;

        for (final ClassSubject classSubject : classSubjects) {
            SchoolDays randomSchoolDay;
            int schoolHour;
            int randomDuration;
            final int WEEKLY_HOURS = classSubject.getWeeklyHours();
            int hoursCounter = WEEKLY_HOURS;

            while (hoursCounter != 0) {
                randomSchoolDay = schoolDays[random.nextInt(schoolDays.length)];
                schoolHour = random.nextInt(MIN_HOUR, MAX_HOUR);

                randomDuration = random.nextInt(1, WEEKLY_HOURS + 1); // weeklyHoursBounds == 1 ? 1 :

                if (checkIfPeriodIsFree(occupiedHours, schoolHour, randomDuration, randomSchoolDay)
                        && (hoursCounter - randomDuration) >= 0) {
                    final Period period = new Period(randomSchoolDay, schoolHour);
                    final ClassSubjectInstance classSubjectInstance = new ClassSubjectInstance(classSubject, period,
                            classRoom, randomDuration);
                    result.add(classSubjectInstance);
                    addClassSubjectInstance(classSubjectInstance);

                    // for each duration, add a placeholder in the hasmap to reserve space
                    reserveHoursInOccupiesHours(occupiedHours, schoolHour, randomDuration, randomSchoolDay);

                    hoursCounter -= randomDuration;
                }
            }
        }

        return result;
    }

    public boolean checkIfPeriodIsFree(final HashMap<SchoolDays, ArrayList<Integer>> occupiedHours,
            final int schoolHour,
            final int duration, final SchoolDays schoolDay) {
        final ArrayList<Integer> allOccupiedHoursOnDay = occupiedHours.get(schoolDay);

        if (allOccupiedHoursOnDay == null) { // entire day is free
            return true;
        }

        for (int i = 0; i < duration; i++) {
            if (allOccupiedHoursOnDay.contains(schoolHour + i)) {
                return false;
            }
        }
        return true;
    }

    public void reserveHoursInOccupiesHours(final HashMap<SchoolDays, ArrayList<Integer>> occupiedHours,
            final int schoolHour,
            final int duration, final SchoolDays schoolDay) {
        final ArrayList<Integer> updatedListOnDay = occupiedHours.getOrDefault(schoolDay, new ArrayList<>());

        for (int i = 0; i < duration; i++) {
            updatedListOnDay.add(schoolHour + i);
        }
        occupiedHours.put(schoolDay, updatedListOnDay);
    }

    public void initRandomTimetableForAllClasses() {
        SchoolClass.getAllSchoolClasss().stream()
                .forEach(e -> createTimetableForClassNew(e.getId(), e.getClassName(), e.getClassRoom()));
    }

    public void createTimetableForClassNew(final Long id, final String className, final Room classRoom) {
        final SchoolClass schoolClass = SchoolClass.getById(id);

        final List<ClassSubject> classSubjects = getAllClassSubjectsWithClass(className);
        final ArrayList<ClassSubjectInstance> classSubjectInstances = createRandomClassSubjectInstances(classSubjects,
                classRoom);

        final Timetable timetable = new Timetable(classSubjectInstances, schoolClass);
        this.currentTimetableList.put(className, timetable); // TODO maybe change with id, or
                                                             // make name id
        addTimetable(timetable);
    }

    public void createTimetableForClass(final String className, final Room classRoom) {
        final List<ClassSubject> classSubjects = getAllClassSubjectsWithClass(className);
        final ArrayList<ClassSubjectInstance> classSubjectInstances = createRandomClassSubjectInstances(classSubjects,
                classRoom);
        this.currentTimetable = new Timetable(classSubjectInstances);
    }
}
