package at.htlleonding.leoplaner.algorithm;

/**
 * The buckets a schedule's cost is split into. A single total tells you the
 * schedule is bad but not why, which makes the soft weights impossible to
 * tune - every category here can be read off on its own.
 *
 * The hard ones are the rules a timetable must not break at all; a schedule
 * is only usable once each of them is zero.
 */
public enum CostCategory {
    /** two lessons booked on the same teacher at the same hour */
    TEACHER_CLASH(true),
    /** two lessons booked into the same fixed room at the same hour */
    ROOM_CLASH(true),
    /** two lessons of one class at the same hour that are not parallel groups */
    CLASS_CLASH(true),
    /** lesson outside the hours its class is taught in (day or evening) */
    OUTSIDE_WINDOW(true),
    /** lesson placed on an hour the teacher does not work at all */
    TEACHER_NON_WORKING(true),
    /** more lessons without a fixed room at one hour than there are classrooms */
    ROOM_CAPACITY(true),
    /** lesson placed on an hour the teacher would rather not work */
    TEACHER_NON_PREFERRED(false),
    /** teacher comes in for only a handful of hours on a day */
    TEACHER_SHORT_DAY(false),
    /** teacher waiting between two lessons */
    TEACHER_GAP(false),
    /** flat surcharge for the weekday a lesson sits on */
    DAY_OF_WEEK(false),
    /** lesson running past the last comfortable hour of the day */
    LATE_HOURS(false),
    /** subject that wants a double period but got a single one */
    DOUBLE_PERIOD(false),
    /** class day that is too short or too long */
    DAY_LENGTH(false),
    /** class days of very uneven length */
    DAY_BALANCE(false),
    /** free hour inside a class day that is not its lunch break */
    CLASS_GAP(false),
    /** class day starting after the first hour of its window */
    LATE_START(false),
    /** the same lesson twice on one day, not back to back */
    SUBJECT_SAME_DAY(false),
    /** long class day without a free hour for lunch */
    LUNCH_BREAK_MISSING(false),
    /** lunch break sitting away from the middle of its day */
    LUNCH_BREAK_POSITION(false),
    /** teacher did not get the free day(s) they asked for, or not their first choice */
    TEACHER_WISH_FREE_DAY(false),
    /** teacher did not get the free afternoon(s) they asked for */
    TEACHER_WISH_FREE_AFTERNOON(false),
    /** teacher starts earlier or ends later than they asked for */
    TEACHER_WISH_TIME_WINDOW(false),
    /** teacher's days are shaped against their wish: too long, too many in a row, gaps, too many days */
    TEACHER_WISH_DAY_SHAPE(false),
    /** two linked teachers not on the same days, or on the same days when they asked for opposite ones */
    TEACHER_WISH_LINKED(false),
    /** teacher's double period wish for a class not met */
    TEACHER_WISH_DOUBLE_PERIOD(false),
    /** teacher's lesson not in the room they asked for; honoured by the room allocation, never charged */
    TEACHER_WISH_ROOM(false);

    private final boolean hard;

    CostCategory(final boolean hard) {
        this.hard = hard;
    }

    public boolean isHard() {
        return hard;
    }
}
