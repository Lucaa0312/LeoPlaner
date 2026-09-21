package at.htlleonding.leoplaner.data;

public enum SchoolDays {
    MONDAY,
    TUESDAY,
    WEDNESDAY,
    THURSDAY,
    FRIDAY,
    SATURDAY;

    private static final SchoolDays[] SCHEDULABLE_DAYS = {
            MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY
    };

    /**
     * Days a lesson may actually be placed on. Saturday is priced as an
     * impossible day, so offering it as a slot only produced proposals that
     * could never be accepted - and because Saturday is usually empty it was
     * the single biggest source of candidate periods.
     */
    public static SchoolDays[] schedulableDays() {
        return SCHEDULABLE_DAYS.clone();
    }

    public boolean isSchedulable() {
        return this != SATURDAY;
    }
}
