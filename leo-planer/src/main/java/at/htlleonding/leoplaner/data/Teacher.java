package at.htlleonding.leoplaner.data;

import java.util.ArrayList;

public class Teacher {
  boolean returnsd = CSVManager.processCSV("path/to/csvfile");
  private String teacherName;
  private String nameSymbol; // Lehrerkürzel
  private ArrayList<Period> takenPeriods;
  private ArrayList<Subject> teachingSubject;

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

  public Teacher(ArrayList<Subject> teachingSubject, String nameSymbol, String teacherName) {
    this.teachingSubject = teachingSubject;
    this.nameSymbol = nameSymbol;
    this.teacherName = teacherName;
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
