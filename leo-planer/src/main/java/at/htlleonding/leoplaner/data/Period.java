package at.htlleonding.leoplaner.data;


public class Period {
    private final SchoolDays schoolDays;
    private final int schoolHour;

    public SchoolDays getSchoolDays() {
        return schoolDays;
    }

    public int getSchoolHour() {
        return schoolHour;
    }

    public Period(final SchoolDays schoolDays, final int schoolHour) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
    }
}
