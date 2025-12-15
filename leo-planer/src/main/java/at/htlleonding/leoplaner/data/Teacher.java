package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

@NamedQueries({
        @NamedQuery(name = Teacher.QUERY_FIND_ALL, query = "select t from Teacher t"),
        @NamedQuery(name = Teacher.QUERY_FIND_BY_NAME, query = "select t from Teacher t where LOWER(t.teacherName) like LOWER(:filter)"),
        @NamedQuery(name = Teacher.QUERY_FIND_BY_ID, query = "select t from Teacher t where t.id = :filter")
})

@Entity
public class Teacher {
    @Id
    @GeneratedValue
    private Long id;
    private String teacherName;
    private String nameSymbol; // Lehrerkürzel

    @ManyToMany(fetch = FetchType.EAGER)
    //@JsonIgnore // TODO later on add dtos maybe
    @JoinTable( // create new table
            name = "teacher_subject", joinColumns = @JoinColumn(name = "teacher_id"), inverseJoinColumns = @JoinColumn(name = "subject_id"))
    private List<Subject> teachingSubject = new ArrayList<>();
    

    //TODO later on add list for periods the teacher does (not) want to (cant) teach

    public static final String QUERY_FIND_ALL = "Teacher.findAll";
    public static final String QUERY_FIND_BY_NAME = "Teacher.findByName";
    public static final String QUERY_FIND_BY_ID = "Teacher.findByID";

    public String getTeacherName() {
        return teacherName;
    }

    public Long getId() {
        return id;
    }

    public String getNameSymbol() {
        return nameSymbol;
    }

    public List<Subject> getTeachingSubject() {
        return teachingSubject;
    }

    public boolean checkIfTeacherTeachesSubject(final Subject subject) {
        return teachingSubject.contains(subject);
    }

    public void setId(final long id) {
        this.id = id;
    }

    public void setTeacherName(final String teacherName) {
        this.teacherName = teacherName;
    }

    public void setNameSymbol(final String nameSymbol) {
        this.nameSymbol = nameSymbol;
    }

    public void setTeachingSubject(final ArrayList<Subject> teachingSubject) {
        this.teachingSubject = teachingSubject;
    }

}
