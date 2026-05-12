package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;

@Entity
public class ClassSubject extends PanacheEntity {
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "class_subject_teachers", joinColumns = @JoinColumn(name = "class_subject_id"), inverseJoinColumns = @JoinColumn(name = "teacher_id"))
    private List<Teacher> teachers;
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

        if (teachers != null && !teachers.isEmpty()) {
            sb.append(", teachers=[");
            teachers.forEach(t -> sb.append(t.getTeacherName())
                    .append(" (ID: ").append(t.getId()).append("), "));
            sb.setLength(sb.length() - 2);
            sb.append("]");
        }

        if (subject != null) {
            if (!sb.isEmpty()) {
                sb.append(", ");
            }
            sb.append("subject=").append(subject.getSubjectName()).append(" (ID: ").append(subject.getId()).append(")");
        }

        if (!sb.isEmpty()) {
            sb.append(", ");
        }
        sb.append("weeklyHours=").append(weeklyHours);
        sb.append(", requiresDoublePeriod=").append(requiresDoublePeriod);
        sb.append(", isBetterDoublePeriod=").append(isBetterDoublePeriod);

        return sb.toString();
    }

    public List<Teacher> getTeachers() {
        return teachers;
    }

    public void setTeachers(List<Teacher> teachers) {
        this.teachers = teachers;
    }

}
