package at.htlleonding.leoplaner.data;

import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.OneToOne;

@NamedQueries({
  @NamedQuery(name = ClassSubject.QUERY_FIND_ALL, query = "Select c from classSubject c")
})

@Entity
public class ClassSubject {
  @Id
  @GeneratedValue
  private long id; // TODO maybe do Long (Object for null support)
  
  @OneToOne
    private Teacher teacher;
  @OneToOne
    private Subject subject;

    private short weeklyHours;
    private boolean requiresDoublePeriod;
    private boolean isBetterDoublePeriod;

    static public final String QUERY_FIND_ALL = "ClassSubject.findAll";


    public Teacher getTeacher() {
        return teacher;
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

    public void setId(long id) {
      this.id = id;
    }

    public void setTeacher(Teacher teacher) {
      this.teacher = teacher;
    }

    public void setSubject(Subject subject) {
      this.subject = subject;
    }

    public void setWeeklyHours(short weeklyHours) {
      this.weeklyHours = weeklyHours;
    }

    public void setRequiresDoublePeriod(boolean requiresDoublePeriod) {
      this.requiresDoublePeriod = requiresDoublePeriod;
    }

    public void setBetterDoublePeriod(boolean isBetterDoublePeriod) {
      this.isBetterDoublePeriod = isBetterDoublePeriod;
    }
}
