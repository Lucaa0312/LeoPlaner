package at.htlleonding.leoplaner.data;


public class Period {
    private SchoolDays schoolDays;
    private int schoolHour;

    public SchoolDays getSchoolDays() {
        return schoolDays;
    }

    public int getSchoolHour() {
        return schoolHour;
    }

    public Period(SchoolDays schoolDays, int schoolHour) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
    }
}
