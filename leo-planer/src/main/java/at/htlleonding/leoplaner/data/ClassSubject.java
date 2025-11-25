package at.htlleonding.leoplaner.data;

import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@NamedQueries({
        @NamedQuery(name = ClassSubject.QUERY_FIND_ALL, query = "Select c from ClassSubject c"),
        @NamedQuery(name = ClassSubject.QUERY_FIND_ALL_BY_CLASSNAME, query = "Select c from ClassSubject c where LOWER(c.className) = :filter")
})

@Entity
public class ClassSubject {
    @Id
    @GeneratedValue
    private Long id;
    @ManyToOne
    private Teacher teacher;
    @ManyToOne
    private Subject subject;

    private short weeklyHours;
    private boolean requiresDoublePeriod;
    private boolean isBetterDoublePeriod;

    private String className;

    static public final String QUERY_FIND_ALL = "ClassSubject.findAll";
    static public final String QUERY_FIND_ALL_BY_CLASSNAME = "ClassSubject.findAllByClassName";

    public Teacher getTeacher() {
        return teacher;
    }

    public Long getId() {
        return id;
    }


    public static String getQueryFindAll() {
        return QUERY_FIND_ALL;
    }

    public Subject getSubject() {
        return subject;
    }

    public short getWeeklyHours() {
        return weeklyHours;
    }

    public boolean isRequiresDoublePeriod() {
        return requiresDoublePeriod;
    }

    public boolean isBetterDoublePeriod() {
        return isBetterDoublePeriod;
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

    public void setWeeklyHours(final short weeklyHours) {
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

    public String getClassName() {
        return className;
    }

    public void setClassName(final String className) {
        this.className = className;
    }
}
