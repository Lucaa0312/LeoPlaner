package at.htlleonding.leoplaner.data;

import java.util.*;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DataRepository {
    private Timetable currentTimetable; // volatile, algorithms keep updating this value at the moment
    private Map<String, Timetable> currentTimetableList = new HashMap<>(); // key = className, value = timetable

    @Inject
    EntityManager entityManager;

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

    public Timetable getCurrentTeacherTimetable(final Long id) {
        this.currentTimetable.sortTimetableBySchoolhour();
        final Teacher teacher = getTeacherByID(id);
        return new Timetable(this.currentTimetable.getClassSubjectInstances().stream()
                .filter(e -> e.getClassSubject() != null
                        && e.getClassSubject().getTeacher().getId().equals(teacher.getId()))
                .toList());
    }

    public List<ClassSubject> getAllClassSubjects() {
        final TypedQuery<ClassSubject> allClassSubjects = this.entityManager.createNamedQuery(
                ClassSubject.QUERY_FIND_ALL,
                ClassSubject.class); // change name to literal not final instance
        return allClassSubjects.getResultList();
    }

    public List<ClassSubject> getAllClassSubjectsWithClass(final String className) {
        final TypedQuery<ClassSubject> allClassSubjectsByClassName = this.entityManager
                .createNamedQuery(ClassSubject.QUERY_FIND_ALL_BY_CLASSNAME, ClassSubject.class);
        allClassSubjectsByClassName.setParameter("filter", className.toLowerCase());
        return allClassSubjectsByClassName.getResultList();
    }

    public List<Teacher> getAllTeachers() {
        final TypedQuery<Teacher> allTeachers = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_ALL,
                Teacher.class);
        return allTeachers.getResultList();
    }

    public Teacher getTeacherByID(final Long id) {
        final TypedQuery<Teacher> teacher = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_ID,
                Teacher.class);
        teacher.setParameter("filter", id);
        return teacher.getSingleResult();
    }

    public Long getTeacherCount() {
        return this.entityManager.createNamedQuery(Teacher.QUERY_GET_COUNT, Long.class).getSingleResult();
    }

    public List<Room> getAllRooms() {
        final TypedQuery<Room> allRooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_ALL, Room.class);
        return allRooms.getResultList();
    }

    public Room getRoomByID(final Long id) {
        final TypedQuery<Room> rooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_BY_ID, Room.class);
        rooms.setParameter("filter", id);
        return rooms.getResultList().isEmpty() ? null : rooms.getResultList().get(0);
    }

    public Room getRoomByNumber(final int number) {
        final TypedQuery<Room> rooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_BY_NUMBER, Room.class);
        rooms.setParameter("filter", number);
        return rooms.getResultList().isEmpty() ? null : rooms.getResultList().get(0);
    }

    public Long getRoomCount() {
        return this.entityManager.createNamedQuery(Room.QUERY_GET_COUNT, Long.class).getSingleResult();
    }

    public List<Subject> getAllSubjects() {
        final TypedQuery<Subject> allSubjects = this.entityManager.createNamedQuery(Subject.QUERY_FIND_ALL,
                Subject.class);
        return allSubjects.getResultList();
    }

    public Subject getSubjectByName(final String name) {
        final TypedQuery<Subject> allSubjects = this.entityManager.createNamedQuery(Subject.QUERY_FIND_BY_NAME,
                Subject.class);
        allSubjects.setParameter("filter", name);
        return allSubjects.getResultList().isEmpty() ? null : allSubjects.getResultList().get(0);
    }

    public Long getSubjectCount() {
        return this.entityManager.createNamedQuery(Subject.QUERY_GET_COUNT, Long.class).getSingleResult();
    }

    public List<SchoolClass> returnAllSchoolClasses() {
        TypedQuery<SchoolClass> query = this.entityManager.createNamedQuery(SchoolClass.QUERY_FIND_ALL,
                SchoolClass.class);
        return query.getResultList();
    }

    public SchoolClass checkIfSchoolClassExists(String className) {
        TypedQuery<SchoolClass> query = this.entityManager.createNamedQuery(SchoolClass.QUERY_CHECK_IF_EXISTS,
                SchoolClass.class);
        query.setParameter("filter", className);
        return query.getSingleResultOrNull();
    }

    public ArrayList<ClassSubject> getClassSubjects() {
        return null;
    }

    public ArrayList<Teacher> getTeachers() {
        return null;
    }

    public ArrayList<Room> getRooms() {
        return null;
    }

    public Room getRoomByNumberName(String numberName) {
        TypedQuery<Room> query = this.entityManager.createNamedQuery(Room.QUERY_FIND_BY_NUMBERNAME, Room.class);
        return query.getSingleResultOrNull();
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

    public Subject getSubjectByNameAndCheckIfExists(final String subjectName) {
        Subject subject;
        try {
            subject = getSubjectByName(subjectName);
        } catch (final Exception e) {
            return null;
        }
        return subject;
    }

    public Teacher getTeacherByNameAndCheckIfExists(final String teacherName) {
        final TypedQuery<Teacher> query = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_NAME,
                Teacher.class); // TODO
        // move
        // this
        // to
        // a
        // modular
        // function
        query.setParameter("filter", teacherName);
        return query.getResultList().isEmpty() ? null : query.getResultList().get(0);
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
                    result.add(new ClassSubjectInstance(classSubject, period, classRoom, randomDuration));

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
        final TypedQuery<SchoolClass> allClasses = this.entityManager.createNamedQuery(SchoolClass.QUERY_FIND_ALL,
                SchoolClass.class);
        allClasses.getResultList().stream()
                .forEach(e -> createTimetableForClassNew(e.getClassName(), e.getClassRoom()));
    }

    public void createTimetableForClassNew(final String className, final Room classRoom) {
        final List<ClassSubject> classSubjects = getAllClassSubjectsWithClass(className);
        final ArrayList<ClassSubjectInstance> classSubjectInstances = createRandomClassSubjectInstances(classSubjects,
                classRoom);
        this.currentTimetableList.put(className, new Timetable(classSubjectInstances)); // TODO maybe change with id, or
                                                                                        // make name id
    }

    public void createTimetableForClass(final String className, final Room classRoom) {
        final List<ClassSubject> classSubjects = getAllClassSubjectsWithClass(className);
        final ArrayList<ClassSubjectInstance> classSubjectInstances = createRandomClassSubjectInstances(classSubjects,
                classRoom);
        this.currentTimetable = new Timetable(classSubjectInstances);
    }
}
