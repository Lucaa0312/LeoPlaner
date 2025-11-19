package at.htlleonding.leoplaner.data;


public class Period {
    private SchoolDays schoolDays;
    private short schoolHour;

    public SchoolDays getSchoolDays() {
        return schoolDays;
    }

    public short getSchoolHour() {
        return schoolHour;
    }

    public Period(SchoolDays schoolDays, short schoolHour) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
    }
}
