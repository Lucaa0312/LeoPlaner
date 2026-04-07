package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;

import java.util.Comparator;

@Entity
public class Timetable extends PanacheEntity {
    @OneToMany
    @JoinTable(name = "timetable_classSubjectInstances", joinColumns = @JoinColumn(name = "timetable_id"), inverseJoinColumns = @JoinColumn(name = "class_subject_instance_id"))
    private List<ClassSubjectInstance> classSubjectInstances;
    private int totalWeeklyHours; // all durations summed up
    private int costOfTimetable = 0;
    private double tempAtTimetable = 0;

    public Timetable() {
    }

    @OneToOne
    @JoinColumn(name = "class_id")
    private SchoolClass schoolClass;

    public Timetable(final List<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public Timetable(final List<ClassSubjectInstance> classSubjectInstances, final SchoolClass schoolClass) {
        this.classSubjectInstances = classSubjectInstances;
        this.schoolClass = schoolClass;
    }

    public static List<Timetable> getAllTimetables() {
        return Timetable.listAll();
    }

    public void sortTimetableBySchoolhour() {
        this.classSubjectInstances.sort(Comparator.comparingInt(e -> e.getPeriod().getSchoolHour()));
    }

    public List<ClassSubjectInstance> getClassSubjectInstances() {
        return classSubjectInstances;
    }

    public void setClassSubjectInstances(final List<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public int getTotalWeeklyHours() {
        return this.totalWeeklyHours;
    }

    public void setTotalWeeklyHours(final int totalWeeklyHours) {
        this.totalWeeklyHours = totalWeeklyHours;
    }

    public int getCostOfTimetable() {
        return costOfTimetable;
    }

    public void setCostOfTimetable(int costOfTimetable) {
        this.costOfTimetable = costOfTimetable;
    }

    public double getTempAtTimetable() {
        return tempAtTimetable;
    }

    public void setTempAtTimetable(double tempAtTimetable) {
        this.tempAtTimetable = tempAtTimetable;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SchoolClass getSchoolClass() {
        return schoolClass;
    }

    public void setSchoolClass(SchoolClass schoolClass) {
        this.schoolClass = schoolClass;
    }

    @Override
    public String toString() {
    return "Timetable{" +
            "weeklyHours=" + this.totalWeeklyHours +
            ", classSubjectInstances=" + this.classSubjectInstances +
            ", cost=" + this.costOfTimetable +
            ", temperature=" + this.tempAtTimetable +
            '}';
}

}
