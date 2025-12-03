package at.htlleonding.leoplaner.data;


public class Period {
    private SchoolDays schoolDays;
    private int schoolHour;
    private boolean isLunchBreak;

    public SchoolDays getSchoolDays() {
        return schoolDays;
    }

    public int getSchoolHour() {
        return schoolHour;
    }

    public Period(final SchoolDays schoolDays, final int schoolHour) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
        this.isLunchBreak = false;
    }

    public Period(final SchoolDays schoolDays, final int schoolHour, final boolean isLunchBreak) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
        this.isLunchBreak = isLunchBreak;
    }

    public boolean isLunchBreak() {
        return isLunchBreak;
    }

    public void setLunchBreak(boolean isLunchBreak) {
        this.isLunchBreak = isLunchBreak;
    }

    public void setSchoolDays(SchoolDays schoolDays) {
        this.schoolDays = schoolDays;
    }

    public void setSchoolHour(int schoolHour) {
        this.schoolHour = schoolHour;
    }
}
