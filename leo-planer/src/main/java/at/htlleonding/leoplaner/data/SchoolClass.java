package at.htlleonding.leoplaner.data;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.NamedQueries;
import jakarta.persistence.NamedQuery;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

@NamedQueries({
        @NamedQuery(name = SchoolClass.QUERY_FIND_ALL, query = "select s from SchoolClass s"),
        @NamedQuery(name = SchoolClass.QUERY_CHECK_IF_EXISTS, query = "select s from SchoolClass s where s.className = :filter")
})

@Entity
public class SchoolClass {
    @Id
    @GeneratedValue
    private Long id;
    private String className;

    @OneToOne
    private Room classRoom;

    public Room getClassRoom() {
        return classRoom;
    }

    public void setClassRoom(Room classRoom) {
        this.classRoom = classRoom;
    }

    @OneToMany(mappedBy = "schoolClass")
    private List<ClassSubject> classSubjects;

    @OneToOne(mappedBy = "schoolClass")
    private Timetable timetable;

    public static final String QUERY_FIND_ALL = "SchoolClass.findAll";
    public static final String QUERY_CHECK_IF_EXISTS = "SchoolClass.checkIfExists";

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
