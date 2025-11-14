package at.htlleonding.leoplaner.data;

import java.util.ArrayList;

public class DataRepository {
  private ArrayList<ClassSubject> classSubjects;
  private ArrayList<Teacher> teachers;
  private ArrayList<Room> rooms;
  private static DataRepository instance;

  public static DataRepository getInstance() {
    return instance;
  }

  private DataRepository() {

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
