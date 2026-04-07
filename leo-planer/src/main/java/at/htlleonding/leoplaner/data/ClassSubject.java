package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

@Entity
public class ClassSubject extends PanacheEntity {
    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;
    @ManyToOne
    @JoinColumn(name = "subject_id")
    private Subject subject;

    private int weeklyHours;
    private boolean requiresDoublePeriod;
    private boolean isBetterDoublePeriod;

    @ManyToOne
    @JoinColumn(name = "class_id")
    private SchoolClass schoolClass;

    public static List<ClassSubject> getAllClassSubjects() {
        return listAll();
    }

    public static List<ClassSubject> getAllByClassName(final String className) {
        return find("LOWER(schoolClass.className) = LOWER(?1)", className).list();
    }

    public static List<ClassSubject> getByTeacher(final Teacher teacher) {
        return find("teacher", teacher).list();
    }

    public static ClassSubject getById(final Long id) {
        return findById(id);
    }

    public Teacher getTeacher() {
        return teacher;
    }

    public Long getId() {
        return id;
    }

    public Subject getSubject() {
        return subject;
    }

    public int getWeeklyHours() {
        return weeklyHours;
    }

    public void setId(final long id) {
        this.id = id;
    }

    public void setTeacher(final Teacher teacher) {
        this.teacher = teacher;
    }

    public void setSubject(final Subject subject) {
        this.subject = subject;
    }

    public void setWeeklyHours(final int weeklyHours) {
        this.weeklyHours = weeklyHours;
    }

    public void setRequiresDoublePeriod(final boolean requiresDoublePeriod) {
        this.requiresDoublePeriod = requiresDoublePeriod;
    }

    public void setBetterDoublePeriod(final boolean isBetterDoublePeriod) {
        this.isBetterDoublePeriod = isBetterDoublePeriod;
    }

    public void setId(final Long id) {
        this.id = id;
    }

    public boolean isRequiresDoublePeriod() {
        return requiresDoublePeriod;
    }

    public boolean isBetterDoublePeriod() {
        return isBetterDoublePeriod;
    }

    public SchoolClass getSchoolClass() {
        return schoolClass;

    }

    public void setSchoolClass(final SchoolClass schoolClass) {
        this.schoolClass = schoolClass;
    }

 @Override
public String toString() {
    StringBuilder sb = new StringBuilder("cs ID: " + this.getId());
    
    if (teacher != null) {
        sb.append(", teacher=").append(teacher.getTeacherName()).append(" (ID: ").append(teacher.getId()).append(")");
    }
    
    if (subject != null) {
        if (sb.length() > 0) {
            sb.append(", ");
        }
        sb.append("subject=").append(subject.getSubjectName()).append(" (ID: ").append(subject.getId()).append(")");
    }
    
    if (sb.length() > 0) {
        sb.append(", ");
    }
    sb.append("weeklyHours=").append(weeklyHours);
    sb.append(", requiresDoublePeriod=").append(requiresDoublePeriod);
    sb.append(", isBetterDoublePeriod=").append(isBetterDoublePeriod);
    
    return sb.toString();
}



}
