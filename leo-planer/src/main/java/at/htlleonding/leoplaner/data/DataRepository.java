package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import io.smallrye.mutiny.helpers.Subscriptions.SingleItemSubscription;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;

@ApplicationScoped
public class DataRepository {
  private ArrayList<ClassSubject> classSubjects;
  private ArrayList<Teacher> teachers;
  private ArrayList<Room> rooms;

  @Inject
  EntityManager entityManager;

  public List<ClassSubject> getAllClassSubjects() {
    TypedQuery<ClassSubject> allClassSubjects = this.entityManager.createNamedQuery(ClassSubject.QUERY_FIND_ALL, ClassSubject.class);
    return allClassSubjects.getResultList();
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

  public ClassSubject addClassSubject(ClassSubject classSubject) { //TODO correct return type???
    if (this.entityManager.contains(classSubject)) {
      throw new IllegalArgumentException();
    }

    this.entityManager.persist(classSubject);
    return classSubject;
  }

  public Teacher addTeacher(Teacher teacher) {
    if (this.entityManager.contains(teacher)) {
      throw new IllegalArgumentException();
    }

    this.entityManager.persist(teacher);
    return teacher;
  }

  public Room addRoom(Room room) {
    if (this.entityManager.contains(room)) {
      throw new IllegalArgumentException();
    }

    this.entityManager.persist(room);
    return room;
  }

  public Subject addSubject(Subject subject) {
    if (this.entityManager.contains(subject)) {
      throw new IllegalArgumentException();
    }

    this.entityManager.persist(subject);
    return subject;
  }
}
