package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class DataRepository {
    private ArrayList<ClassSubject> classSubjects;
    private ArrayList<Teacher> teachers;
    private ArrayList<Room> rooms;

    @Inject
    EntityManager entityManager;

    public List<ClassSubject> getAllClassSubjects() {
        TypedQuery<ClassSubject> allClassSubjects = this.entityManager.createNamedQuery(ClassSubject.QUERY_FIND_ALL, ClassSubject.class); //change name to literal not final instance
        return allClassSubjects.getResultList();
    }

    public List<Teacher> getAllTeachers() {
        TypedQuery<Teacher> allTeachers = this.entityManager.createNamedQuery(Teacher.QUERY_FIND_ALL, Teacher.class);
        return allTeachers.getResultList();
    }

    public List<Room> getAllRooms() {
        TypedQuery<Room> allRooms = this.entityManager.createNamedQuery(Room.QUERY_FIND_ALL, Room.class);
        return allRooms.getResultList();
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
}
