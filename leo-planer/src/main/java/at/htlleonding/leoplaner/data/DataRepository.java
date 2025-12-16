package at.htlleonding.leoplaner.data;

import at.htlleonding.leoplaner.data.SchoolDays;

import java.util.*;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DataRepository {
    private Timetable currentTimetable; //volatile, algorithms keep updating this value at the moment

    @Inject
    EntityManager entityManager;

    public Timetable getCurrentTimetable() {
        return currentTimetable;
    }

    public void setCurrentTimetable(Timetable currentTimetable) {
        this.currentTimetable = currentTimetable;
    }


    public List<ClassSubject> getAllClassSubjects() {
        TypedQuery<ClassSubject> allClassSubjects = this.entityManager.createNamedQuery(ClassSubject.QUERY_FIND_ALL, ClassSubject.class); //change name to literal not final instance
        return allClassSubjects.getResultList();
    }

    public List<ClassSubject> getAllClassSubjectsWithClass(String className) {
        TypedQuery<ClassSubject> allClassSubjectsByClassName = this.entityManager.createNamedQuery(ClassSubject.QUERY_FIND_ALL_BY_CLASSNAME, ClassSubject.class);
        allClassSubjectsByClassName.setParameter("filter", className.toLowerCase());
        return allClassSubjectsByClassName.getResultList();
    }

    public List<Teacher> getAllTeachers() {
        TypedQuery<Teacher> allTeachers = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_ALL, Teacher.class);
        return allTeachers.getResultList();
    }

    public Teacher getTeacherByID(Long id) {
        TypedQuery<Teacher> teacher = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_ID, Teacher.class);
        teacher.setParameter("filter", id);
        return teacher.getSingleResult();
    }

    public List<Room> getAllRooms() {
        TypedQuery<Room> allRooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_ALL, Room.class);
        return allRooms.getResultList();
    }

    public Room getRoomByID(Long id) {
        TypedQuery<Room> rooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_BY_ID, Room.class);
        rooms.setParameter("filter", id);
        return rooms.getResultList().isEmpty() ? null : rooms.getResultList().get(0);
    }

    public Room getRoomByNumber(int number) {
        TypedQuery<Room> rooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_BY_NUMBER, Room.class);
        rooms.setParameter("filter", number);
        return rooms.getResultList().isEmpty() ? null : rooms.getResultList().get(0);
    }

    public List<Subject> getAllSubjects() {
        TypedQuery<Subject> allSubjects = this.entityManager.createNamedQuery("Subject.findAll", Subject.class);
        return allSubjects.getResultList();
    }

    public Subject getSubjectByName(String name) {
        TypedQuery<Subject> allSubjects = this.entityManager.createNamedQuery("Subject.findByName", Subject.class);
        allSubjects.setParameter("filter", name);
        return allSubjects.getResultList().isEmpty() ? null : allSubjects.getResultList().get(0);
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

    @Transactional
    public ClassSubject addClassSubject(ClassSubject classSubject) { //TODO correct return type???
        if (this.entityManager.contains(classSubject)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(classSubject);
        return classSubject;
    }

    @Transactional
    public Teacher addTeacher(Teacher teacher) {
        if (this.entityManager.contains(teacher)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(teacher);
        return teacher;
    }

    @Transactional
    public Room addRoom(Room room) {
        if (this.entityManager.contains(room)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(room);
        return room;
    }

    @Transactional
    public Subject addSubject(Subject subject) {
        if (this.entityManager.contains(subject)) {
            throw new IllegalArgumentException();
        }

        this.entityManager.persist(subject);
        return subject;
    }

    public Subject getSubjectByNameAndCheckIfExists(String subjectName) {
        Subject subject;
        try {
            subject = getSubjectByName(subjectName);
        } catch (Exception e) {
            return null;
        }
        return subject;
    }

    public Teacher getTeacherByNameAndCheckIfExists(String teacherName) {
        TypedQuery<Teacher> query = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_NAME, Teacher.class); // TODO move this to a modular function
        query.setParameter("filter", teacherName);
        return query.getResultList().isEmpty() ? null : query.getResultList().get(0);
    }

    public ArrayList<ClassSubjectInstance> createRandomClassSubjectInstances(List<ClassSubject> classSubjects, Room classRoom) {
        //List<Room> getAllRooms = getAllRooms(); //TODO add special rooms
        SchoolDays[] schoolDays = SchoolDays.values();
        HashMap<SchoolDays, Integer> checkRandom = new HashMap<>();

        ArrayList<ClassSubjectInstance> result = new ArrayList<>();
        Random random = new Random();
        for (ClassSubject classSubject : classSubjects) {
            SchoolDays randomSchoolDay;
            int schoolHour;
            int randomDuration;
            int hoursCounter = classSubject.getWeeklyHours();
            while (hoursCounter != 0) {
                randomSchoolDay = schoolDays[random.nextInt(schoolDays.length)];
                schoolHour = random.nextInt(1, 9);

                int weeklyHoursBounds = classSubject.getWeeklyHours();
                randomDuration = random.nextInt(1, weeklyHoursBounds+1); //weeklyHoursBounds == 1 ? 1 :
                System.out.println(randomDuration);

                //chek if other multi-class instance takes up period already
                boolean periodIsFree = true;
                for (int i = 0; i < randomDuration; i++) {
                    if (checkRandom.get(randomSchoolDay) != null && checkRandom.get(randomSchoolDay) + i == schoolHour) {
                        periodIsFree = false;
                    }
                }

                if ((checkRandom.get(randomSchoolDay) == null || periodIsFree) 
                    && (hoursCounter - randomDuration) >= 0) {
                    Period period = new Period(randomSchoolDay, schoolHour);
                    result.add(new ClassSubjectInstance(classSubject, period, classRoom, randomDuration));
                    checkRandom.put(randomSchoolDay, schoolHour);
                    hoursCounter -= randomDuration;
                }
            }
        }

        return result;
    }

    public void createTimetable(String className, Room classRoom) {
        List<ClassSubject> classSubjects = getAllClassSubjectsWithClass(className);
        ArrayList<ClassSubjectInstance> classSubjectInstances = createRandomClassSubjectInstances(classSubjects, classRoom);
        this.currentTimetable = new Timetable(classSubjectInstances);
    }
}
