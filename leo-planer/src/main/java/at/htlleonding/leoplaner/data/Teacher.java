package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;

@Entity
public class Teacher extends PanacheEntity {
    private String teacherName;
    private String nameSymbol; // Lehrerkürzel

    @ManyToMany(fetch = FetchType.EAGER)
    // @JsonIgnore // TODO later on add dtos maybe
    @JoinTable( // create new table
            name = "teacher_subject", joinColumns = @JoinColumn(name = "teacher_id"), inverseJoinColumns = @JoinColumn(name = "subject_id"))
    private List<Subject> teachingSubject = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "teacher_non_working_hours", joinColumns = @JoinColumn(name = "teacher_id"))
    private List<TeacherNonWorkingHours> teacher_non_working_hours = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "teacher_non_preferred_hours", joinColumns = @JoinColumn(name = "teacher_id"))
    private List<TeacherNonPreferredHours> teacher_non_preferred_hours = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "teacher_periods", joinColumns = @JoinColumn(name = "teacher_id"))
    private List<TeacherTakenPeriod> takenUpPeriods = new ArrayList<>();

    public static List<Teacher> getByName(final String filter) {
        return find("LOWER(teacherName) like LOWER(?1)", "%" + filter + "%").list();
    }

    public static Teacher getFirstByName(final String filter) {
        return find("LOWER(teacherName) like LOWER(?1)", "%" + filter + "%").firstResult();
    }

    public static Teacher getById(final Long id) {
        return find("id", id).firstResult();
    }

    public static List<Teacher> getAllTeachers() {
        return Teacher.listAll();
    }

    public static long getCountOfAllTeachers() {
        return Teacher.count();
    }

    public boolean checkIfHourExistsInNonWorkingList(final TeacherNonWorkingHours tnw) {
        return listContainsHour(this.teacher_non_working_hours, tnw);
    }

    public boolean checkIfHourExistsInNonPreferredList(final TeacherNonPreferredHours tnw) {
        return listContainsHour(this.teacher_non_preferred_hours, tnw);
    }

    public <T extends HoursPeriod> boolean listContainsHour(final List<T> list, final T hour) {
        return list.stream().anyMatch(e -> e.getDay() == hour.getDay() && e.getSchoolHour() == hour.getSchoolHour());
    }

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

    public void setTeacherName(final String teacherName) {
        this.teacherName = teacherName;
    }

    public void setNameSymbol(final String nameSymbol) {
        this.nameSymbol = nameSymbol;
    }

    public List<TeacherNonWorkingHours> getTeacher_non_working_hours() {
        return teacher_non_working_hours;
    }

    public void setTeacher_non_working_hours(final List<TeacherNonWorkingHours> teacher_non_working_hours) {
        this.teacher_non_working_hours = teacher_non_working_hours;
    }

    public List<TeacherNonPreferredHours> getTeacher_non_preferred_hours() {
        return teacher_non_preferred_hours;
    }

    public void setTeacher_non_preferred_hours(final List<TeacherNonPreferredHours> teacher_non_preferred_hours) {
        this.teacher_non_preferred_hours = teacher_non_preferred_hours;
    }

    public void setId(final Long id) {
        this.id = id;
    }

    public void setTeachingSubject(final List<Subject> teachingSubject) {
        this.teachingSubject = teachingSubject;
    }

    public List<TeacherTakenPeriod> getTakenUpPeriods() {
        return takenUpPeriods;
    }

    public void setTakenUpPeriods(final List<TeacherTakenPeriod> takenUpPeriods) {
        this.takenUpPeriods = takenUpPeriods;
    }

}
