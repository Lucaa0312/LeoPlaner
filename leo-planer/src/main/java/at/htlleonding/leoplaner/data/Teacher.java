package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.*;

import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@NamedQueries({
        @NamedQuery(name = Teacher.QUERY_FIND_ALL, query = "select t from Teacher t"),
        @NamedQuery(name = Teacher.QUERY_FIND_BY_NAME, query = "select t from Teacher t where LOWER(t.teacherName) like LOWER(:filter)"),
        @NamedQuery(name = Teacher.QUERY_FIND_BY_ID, query = "select t from Teacher t where t.id = :filter"),
        @NamedQuery(name = Teacher.QUERY_GET_COUNT, query = "select count(t) from Teacher t")
})

@Entity
public class Teacher {
    @Id
    @GeneratedValue
    private Long id;
    private String teacherName;
    private String nameSymbol; // Lehrerkürzel

    @ManyToMany(fetch = FetchType.EAGER)
    // @JsonIgnore // TODO later on add dtos maybe
    @JoinTable( // create new table
            name = "teacher_subject", joinColumns = @JoinColumn(name = "teacher_id"), inverseJoinColumns = @JoinColumn(name = "subject_id"))
    private List<Subject> teachingSubject = new ArrayList<>();

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({ "teacher" })
    private List<TeacherNonWorkingHours> teacher_non_working_hours = new ArrayList<>();

    @OneToMany(mappedBy = "teacher", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties({ "teacher" })
    private List<TeacherNonPreferredHours> teacher_non_preferred_hours = new ArrayList<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "teacher_periods", joinColumns = @JoinColumn(name = "teacher_id"))
    private List<TeacherTakenPeriod> takenUpPeriods = new ArrayList<>();

    public static final String QUERY_FIND_ALL = "Teacher.findAll";
    public static final String QUERY_FIND_BY_NAME = "Teacher.findByName";
    public static final String QUERY_FIND_BY_ID = "Teacher.findByID";
    public static final String QUERY_GET_COUNT = "Teacher.getCount";

    public boolean checkIfHourExistsInNonWorkingList(TeacherNonWorkingHours tnw) {
        return listContainsHour(this.teacher_non_working_hours, tnw);
    }

    public boolean checkIfHourExistsInNonPreferredList(TeacherNonPreferredHours tnw) {
        return listContainsHour(this.teacher_non_preferred_hours, tnw);
    }

    public <T extends HoursPeriod> boolean listContainsHour(List<T> list, T hour) {
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

    public List<TeacherNonWorkingHours> getTeacher_non_working_hours() {
        return teacher_non_working_hours;
    }

    public void setTeacher_non_working_hours(List<TeacherNonWorkingHours> teacher_non_working_hours) {
        this.teacher_non_working_hours = teacher_non_working_hours;
    }

    public List<TeacherNonPreferredHours> getTeacher_non_preferred_hours() {
        return teacher_non_preferred_hours;
    }

    public void setTeacher_non_preferred_hours(List<TeacherNonPreferredHours> teacher_non_preferred_hours) {
        this.teacher_non_preferred_hours = teacher_non_preferred_hours;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setTeachingSubject(List<Subject> teachingSubject) {
        this.teachingSubject = teachingSubject;
    }

    public List<TeacherTakenPeriod> getTakenUpPeriods() {
        return takenUpPeriods;
    }

    public void setTakenUpPeriods(List<TeacherTakenPeriod> takenUpPeriods) {
        this.takenUpPeriods = takenUpPeriods;
    }
}
