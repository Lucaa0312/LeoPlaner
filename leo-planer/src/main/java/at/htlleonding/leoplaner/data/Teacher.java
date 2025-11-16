package at.htlleonding.leoplaner.data;

import java.util.ArrayList;

public class Teacher {
  private String teacherName;
  private String nameSymbol; // Lehrerkürzel
  private ArrayList<Period> takenPeriods;
  private ArrayList<Subject> teachingSubject; // TODO maybe change to array since it cannot be chagned at runtime

  public String getTeacherName() {
    return teacherName;
  }

  public String getNameSymbol() {
    return nameSymbol;
  }

  public ArrayList<Period> getTakenPeriods() {
    return takenPeriods;
  }

  public ArrayList<Subject> getTeachingSubject() {
    return teachingSubject;
  }

  public Teacher(String teacherName, String nameSymbol, ArrayList<Subject> teachingSubject) {
    this.teacherName = teacherName;
    this.nameSymbol = nameSymbol;
    this.teachingSubject = teachingSubject;
  }

  public boolean checkIfTeacherTeachesSubject(Subject subject) {
    return teachingSubject.contains(subject);
  }

  public boolean checkIfTeacherAvailableInPeriod(Period period) {
    return !takenPeriods.contains(period);
  }

  public boolean addTeacherPeriod(Period period) {
    if (!checkIfTeacherAvailableInPeriod(period))
      return false;
    this.takenPeriods.add(period);
    return true;
  }

}
