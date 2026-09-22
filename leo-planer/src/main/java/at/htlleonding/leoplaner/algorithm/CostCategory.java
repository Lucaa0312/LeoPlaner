package at.htlleonding.leoplaner.algorithm;

/**
 * The buckets a schedule's cost is split into. A single total tells you the
 * schedule is bad but not why, which makes the soft weights impossible to
 * tune - every category here can be read off on its own.
 */
public enum CostCategory {
    /** two classes booked on the same teacher at the same hour */
    TEACHER_CLASH,
    /** two classes booked into the same room at the same hour */
    ROOM_CLASH,
    /** lesson placed on an hour the teacher does not work at all */
    TEACHER_NON_WORKING,
    /** lesson placed on an hour the teacher would rather not work */
    TEACHER_NON_PREFERRED,
    /** teacher comes in for only a handful of hours on a day */
    TEACHER_SHORT_DAY,
    /** flat surcharge for the weekday a lesson sits on */
    DAY_OF_WEEK,
    /** lesson running past the last comfortable hour of the day */
    LATE_HOURS,
    /** subject that wants a double period but got a single one */
    DOUBLE_PERIOD,
    /** class day that is too short or too long */
    DAY_LENGTH,
    /** class days of very uneven length */
    DAY_BALANCE;
}
