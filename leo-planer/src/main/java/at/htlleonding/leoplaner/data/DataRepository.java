package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class DataRepository {
  private ArrayList<ClassSubject> classSubjects;
  private ArrayList<Teacher> teachers;
  private ArrayList<Room> rooms;

  public List<ClassSubject> getAllClassSubjects() { // Extend with TypedQuery once DataBase is set up
    return classSubjects;
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

  public boolean addTeacher(Teacher teacher) {
    return true;
  }

  public boolean addRoom(Room room) {
    return true;
  }

  public boolean addClassSubject(ClassSubject classSubject) {
    return true;
  }
}
