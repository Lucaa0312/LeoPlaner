package at.htlleonding.leoplaner.data;

import java.util.ArrayList;

public class DataRepository {
  private ArrayList<ClassSubject> classSubjects;
  private ArrayList<Subject> subjects;
  private ArrayList<Teacher> teachers;
  private ArrayList<Room> rooms;
  private static DataRepository instance;

  public static DataRepository getInstance() {
    if(instance == null) {
      instance = new DataRepository();
    }
    return instance;
  }

  private DataRepository() {
    this.classSubjects = new ArrayList<>();
    this.subjects = new ArrayList<>();
    this.teachers = new ArrayList<>();
    this.rooms = new ArrayList<>();
  }

  public ArrayList<ClassSubject> getClassSubjects() {
    return this.classSubjects;
  }

  public ArrayList<Teacher> getTeachers() {
    return this.teachers;
  }

  public ArrayList<Room> getRooms() {
    return this.rooms;
  }

  public boolean addTeacher(Teacher teacher) {
    this.teachers.add(teacher);
    return true;
  }

  public boolean addRoom(Room room) {
    this.rooms.add(room);
    return true;
  }

  public boolean addClassSubject(ClassSubject classSubject) {
    this.classSubjects.add(classSubject);
    return true;
  }

  public boolean addSubject(Subject subject) {
    this.subjects.add(subject);
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
