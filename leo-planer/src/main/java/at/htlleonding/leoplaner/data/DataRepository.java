package at.htlleonding.leoplaner.data;

import java.util.ArrayList;

public class DataRepository {
  private ArrayList<ClassSubject> classSubjects;
  private ArrayList<Subject> subjects;
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

  public boolean addSubject(Subject Subject) {
    return true;
  }

  public Subject checkIfSubjectExists(String subjectName) {
    return subjects.stream()
        .filter(subject -> subject.getSubjectName().equalsIgnoreCase(subjectName))
        .findFirst()
        .orElse(null);
  }

  public Room checkIfRoomExists(String roomName) {
    return rooms.stream()
        .filter(room -> room.getRoomName().equalsIgnoreCase(roomName))
        .findFirst()
        .orElse(null);
  }
}
