package at.htlleonding.leoplaner.data;

import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

public class TeacherNonPreferredHours {
    @Id
    @GeneratedValue
    Long id;

    @ManyToOne
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    private SchoolDays day;
    private Integer schoolHour;

    public Long getId() {
      return id;
    }

    public void setId(final Long id) {
      this.id = id;
    }

    public Teacher getTeacher() {
      return teacher;
    }

    public void setTeacher(final Teacher teacher) {
      this.teacher = teacher;
    }

    public SchoolDays getDay() {
      return day;
    }

    public void setDay(final SchoolDays day) {
      this.day = day;
    }

    public Integer getSchoolHour() {
      return schoolHour;
    }

    public void setSchoolHour(final Integer schoolHour) {
      this.schoolHour = schoolHour;
    }
}
