package at.htlleonding.leoplaner.data;

/**
 * The school hour grid. Hours run from FIRST_SCHOOL_HOUR to LAST_SCHOOL_HOUR
 * across day and evening; each class is only taught in the part its window
 * (SchoolClass.firstHour to lastHour) allows.
 *
 * Placing lessons, moving them and pricing the result is done by
 * at.htlleonding.leoplaner.algorithm.Schedule.
 */
public final class TimetableManager {

    public static final int FIRST_SCHOOL_HOUR = 1;

    // the whole grid, day and evening; a class only uses the part its window allows
    public static final int LAST_SCHOOL_HOUR = SchoolClass.EVENING_LAST_HOUR;

    private TimetableManager() {
    }
}
