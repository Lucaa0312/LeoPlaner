package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

@Entity
public class SchoolClass extends PanacheEntity {
    private String className;

    @OneToOne
    private Room classRoom;

    public Room getClassRoom() {
        return classRoom;
    }

    public void setClassRoom(final Room classRoom) {
        this.classRoom = classRoom;
    }

    @OneToMany(mappedBy = "schoolClass")
    private List<ClassSubject> classSubjects;

    @OneToOne(mappedBy = "schoolClass")
    private Timetable timetable;

    public static List<SchoolClass> getByName(final String filter) {
        return find("LOWER(className) like LOWER(?1)", "%" + filter + "%").list();
    }

    public static SchoolClass getFirstByName(final String filter) {
        return find("LOWER(className) like LOWER(?1)", "%" + filter + "%").firstResult();
    }

    public static SchoolClass getById(final Long id) {
        return find("id", id).firstResult();
    }

    public static List<SchoolClass> getAllSchoolClasss() {
        return SchoolClass.listAll();
    }

    public static long getCountOfAllSchoolClasss() {
        return SchoolClass.count();
    }

    public Long getId() {
        return id;
    }

    public void setId(final Long id) {
        this.id = id;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(final String className) {
        this.className = className;
    }

    public List<ClassSubject> getClassSubjects() {
        return classSubjects;
    }

    public void setClassSubjects(final List<ClassSubject> classSubjects) {
        this.classSubjects = classSubjects;
    }

    public Timetable getTimetable() {
        return timetable;
    }

    public void setTimetable(final Timetable timetable) {
        this.timetable = timetable;
    }
}
