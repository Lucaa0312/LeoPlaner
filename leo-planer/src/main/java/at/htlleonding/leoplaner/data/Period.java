package at.htlleonding.leoplaner.data;

import jakarta.persistence.Embeddable;

@Embeddable
public class Period {
    private SchoolDays schoolDays;
    private int schoolHour;
    private boolean lunchBreak;

    public Period(final SchoolDays schoolDays, final int schoolHour) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
        this.lunchBreak = false;
    }

    public Period(final SchoolDays schoolDays, final int schoolHour, final boolean lunchBreak) {
        this.schoolDays = schoolDays;
        this.schoolHour = schoolHour;
        this.lunchBreak = lunchBreak;
    }

    public boolean isLunchBreak() {
        return lunchBreak;
    }

    public SchoolDays getSchoolDays() {
        return schoolDays;
    }

    public int getSchoolHour() {
        return schoolHour;
    }

    public void setLunchBreak(boolean lunchBreak) {
        this.lunchBreak = lunchBreak;
    }

    public void setSchoolDays(SchoolDays schoolDays) {
        this.schoolDays = schoolDays;
    }

    public void setSchoolHour(int schoolHour) {
        this.schoolHour = schoolHour;
    }
}
