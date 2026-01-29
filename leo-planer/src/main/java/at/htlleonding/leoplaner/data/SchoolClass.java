package at.htlleonding.leoplaner.data;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

@Entity
public class SchoolClass {
    @Id
    @GeneratedValue
    private Long id;
    private String className;

    @OneToMany(mappedBy = "schoolClass")
    private List<ClassSubject> classSubjects;

    @OneToOne(mappedBy = "schoolClass")
    private Timetable timetable;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public List<ClassSubject> getClassSubjects() {
        return classSubjects;
    }

    public void setClassSubjects(List<ClassSubject> classSubjects) {
        this.classSubjects = classSubjects;
    }

    public Timetable getTimetable() {
        return timetable;
    }

    public void setTimetable(Timetable timetable) {
        this.timetable = timetable;
    }
}
