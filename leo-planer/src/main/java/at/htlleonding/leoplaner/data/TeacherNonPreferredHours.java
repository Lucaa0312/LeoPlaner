package at.htlleonding.leoplaner.data;

import jakarta.persistence.Embeddable;

@Embeddable
public class TeacherNonPreferredHours implements HoursPeriod {
    private SchoolDays day;
    private Integer schoolHour;

    @Override
    public SchoolDays getDay() {
        return day;
    }

    public void setDay(final SchoolDays day) {
        this.day = day;
    }

    @Override
    public Integer getSchoolHour() {
        return schoolHour;
    }

    public void setSchoolHour(final Integer schoolHour) {
        this.schoolHour = schoolHour;
    }
}
