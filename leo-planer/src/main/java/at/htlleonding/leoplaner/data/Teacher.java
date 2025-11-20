package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

@NamedQueries({
    @NamedQuery(name = Teacher.QUERY_FIND_ALL, query = "select t from Teacher t"),
    @NamedQuery(name = Teacher.QUERY_FIND_BY_NAME, query = "select t from Teacher t where LOWER(t.teacherName) like LOWER(:filter)")
})

@Entity
public class Teacher {
  @Id
  @GeneratedValue
  private Long id;
  private String teacherName;
  private String nameSymbol; // Lehrerkürzel

  @ManyToMany
  @JoinTable( // create new table
      name = "teacher_subject", joinColumns = @JoinColumn(name = "teacher_id"), inverseJoinColumns = @JoinColumn(name = "subject_id"))
  private List<Subject> teachingSubject = new ArrayList<>();

  public static final String QUERY_FIND_ALL = "Teacher.findAll";
  public static final String QUERY_FIND_BY_NAME = "Teacher.findByName";

  public String getTeacherName() {
    return teacherName;
  }

  public String getNameSymbol() {
    return nameSymbol;
  }

  public List<Subject> getTeachingSubject() {
    return teachingSubject;
  }

  public boolean checkIfTeacherTeachesSubject(Subject subject) {
    return teachingSubject.contains(subject);
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

  public void setTeachingSubject(ArrayList<Subject> teachingSubject) {
    this.teachingSubject = teachingSubject;
  }

}
