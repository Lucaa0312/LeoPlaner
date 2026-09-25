package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

@Entity
public class SchoolClass extends PanacheEntity {
    public static final int DAY_FIRST_HOUR = 1;
    public static final int DAY_LAST_HOUR = 10;
    public static final int EVENING_FIRST_HOUR = 11;
    public static final int EVENING_LAST_HOUR = 16;

    private String className;

    // the hours this class may be taught in, evening classes only get the evening
    private int firstHour = DAY_FIRST_HOUR;
    private int lastHour = DAY_LAST_HOUR;

    // several classes can share a home room, e.g. a day and an evening class
    @ManyToOne
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

    public int getFirstHour() {
        return firstHour;
    }

    public void setFirstHour(final int firstHour) {
        this.firstHour = firstHour;
    }

    public int getLastHour() {
        return lastHour;
    }

    public void setLastHour(final int lastHour) {
        this.lastHour = lastHour;
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
