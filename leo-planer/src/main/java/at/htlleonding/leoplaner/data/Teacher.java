package at.htlleonding.leoplaner.data;

import java.util.ArrayList;

import jakarta.persistence.*;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;


@NamedQueries({
  @NamedQuery(name = Teacher.QUERY_FIND_ALL, query = "select t from Teacher t")
})
@Entity
public class Teacher {
  @Id
  @GeneratedValue
  private long id;
  private String teacherName;
  private String nameSymbol; // Lehrerkürzel
  @ElementCollection
  private ArrayList<Period> takenPeriods;
  @OneToMany
  private ArrayList<Subject> takenSubjects;

  @OneToMany
  private ArrayList<Subject> teachingSubject;

  public static final String QUERY_FIND_ALL = "Teacher.findAll";

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

  public void setId(long id) {
    this.id = id;
  }

  public void setTeacherName(String teacherName) {
    this.teacherName = teacherName;
  }

  public void setNameSymbol(String nameSymbol) {
    this.nameSymbol = nameSymbol;
  }

  public void setTakenPeriods(ArrayList<Period> takenPeriods) {
    this.takenPeriods = takenPeriods;
  }

  public void setTeachingSubject(ArrayList<Subject> teachingSubject) {
    this.teachingSubject = teachingSubject;
  }

  public ArrayList<Subject> getTakenSubjects() {
    return takenSubjects;
  }

  public void setTakenSubjects(ArrayList<Subject> takenSubjects) {
    this.takenSubjects = takenSubjects;
  }
}
