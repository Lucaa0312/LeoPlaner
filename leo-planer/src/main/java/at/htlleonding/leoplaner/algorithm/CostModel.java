package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.SchoolDays;

/**
 * The prices of the cost function, and the rules that turn a day into a cost.
 * Kept apart from the Schedule that applies them so the weights can be read
 * and tuned in one place.
 */
public final class CostModel {

    public static final long LOW_COST = 3;
    public static final long MID_COST = 10;
    public static final long HIGH_COST = 20;
    public static final long SEVERE_COST = 50;
    /** is to never be accepted */
    public static final long IMPOSSIBLE_COST = 100_000_000;

    /**
     * How a class's week should be shaped, all in school hours counted from the
     * start of the class's window. These are the knobs to turn when the plans
     * come out too long, too lopsided or with Friday still running to the
     * ninth hour.
     */
    public static final int MIN_HOURS_PER_DAY = 4;
    public static final int MAX_HOURS_PER_DAY = 8;
    public static final int MAX_HOURS_ON_FRIDAY = 5;
    public static final int MIN_TEACHER_HOURS_PER_DAY = 4;
    public static final int LAST_COMFORTABLE_HOUR = 6;

    /** How long a day has to be before it needs a lunch break at all. */
    public static final int LUNCH_BREAK_MIN_DAY_HOURS = 6;

    /**
     * A free hour inside a class day means a class waiting in the corridor,
     * which school timetables avoid almost at any price.
     */
    public static final long CLASS_GAP_COST = SEVERE_COST;
    /**
     * A class day starting after the first hour for no reason: the class
     * could simply have come an hour earlier and gone home an hour earlier.
     */
    public static final long LATE_START_COST = SEVERE_COST;
    /** the same lesson coming back later on a day it was already taught */
    public static final long SUBJECT_SAME_DAY_COST = HIGH_COST;
    public static final long LUNCH_BREAK_MISSING_COST = 2 * SEVERE_COST;
    public static final long TEACHER_GAP_COST = LOW_COST;
    // a lesson with no room to go to is as impossible as a clash
    public static final long ROOM_CAPACITY_COST = IMPOSSIBLE_COST;

    private CostModel() {
    }

    public static long costOfDay(final SchoolDays day) {
        return switch (day) {
            case FRIDAY -> MID_COST;
            case SATURDAY -> IMPOSSIBLE_COST;
            default -> LOW_COST;
        };
    }

    /**
     * The hour a lunch break would ideally sit on for a day of lessonHours
     * class hours, counted from the first lesson of the day: it splits the day
     * as evenly as it can.
     */
    public static int idealLunchBreakHour(final int lessonHours) {
        return (lessonHours + 2) / 2;
    }

    /**
     * Cost of a teacher coming in for only a couple of hours on a day.
     *
     * Days the teacher does not work at all are free, so this must stay a soft,
     * smoothly growing penalty: a stepped version that jumped from 0 to SEVERE
     * the moment a day got its first lesson made emptying a day the cheapest
     * fix and pushed every teacher's hours into a few long days.
     */
    public static long teacherDayLength(final int hours) {
        if (hours <= 0 || hours >= MIN_TEACHER_HOURS_PER_DAY) {
            return 0;
        }
        final int missing = MIN_TEACHER_HOURS_PER_DAY - hours;
        return (long) missing * missing * MID_COST;
    }

    /**
     * Cost of a lesson ending after the last comfortable hour. hour is counted
     * from the start of the class's window, so an evening class is not
     * punished for starting in the evening.
     */
    public static long classPosition(final int hour, final int duration, final SchoolDays day) {
        final int endHour = hour + duration - 1;
        if (endHour <= LAST_COMFORTABLE_HOUR) {
            return 0;
        }
        final int hoursOver = endHour - LAST_COMFORTABLE_HOUR;
        // quadratic, so the ninth hour hurts far more than the seventh. At LOW
        // a Monday running to the ninth hour next to a short Wednesday was
        // cheaper than evening them out; Friday is kept short by its own cap
        // (maxHoursOnDay) and its surcharge per lesson (costOfDay)
        return hoursOver * hoursOver * MID_COST;
    }

    /**
     * Cost of a class day being too short or too long. Both ends are priced and
     * the penalty grows quadratically, so the annealer gets a gradient it can
     * walk down an hour at a time instead of a cliff it can only jump off.
     */
    public static long dayLength(final SchoolDays day, final int hours) {
        if (hours <= 0) {
            return 0; // a genuinely free day is allowed; dayBalance prices it
        }
        long cost = 0;
        if (hours < MIN_HOURS_PER_DAY) {
            final int missing = MIN_HOURS_PER_DAY - hours;
            cost += (long) missing * missing * MID_COST;
        }
        final int maxHours = maxHoursOnDay(day);
        if (hours > maxHours) {
            final int excess = hours - maxHours;
            cost += (long) excess * excess * HIGH_COST;
        }
        return cost;
    }

    /** Friday is capped shorter than the rest of the week. */
    public static int maxHoursOnDay(final SchoolDays day) {
        return day == SchoolDays.FRIDAY ? MAX_HOURS_ON_FRIDAY : MAX_HOURS_PER_DAY;
    }

    /**
     * Cost of a day's lunch break sitting away from the middle of that day.
     * breakHour is counted from the first lesson of the day; null means the
     * day has no break, which costs nothing here.
     */
    public static long lunchBreakPosition(final Integer breakHour, final int lessonHours) {
        if (breakHour == null || lessonHours <= 0) {
            return 0;
        }
        final int deviation = Math.abs(breakHour - idealLunchBreakHour(lessonHours));
        return (long) deviation * deviation * LOW_COST;
    }

    /**
     * Cost of a class's days being of very uneven length, measured across
     * Monday to Thursday only: Friday is meant to be the short day.
     * hoursPerDay is indexed by SchoolDays.ordinal().
     */
    public static long dayBalance(final int[] hoursPerDay) {
        int max = Integer.MIN_VALUE;
        int min = Integer.MAX_VALUE;
        for (final SchoolDays day : SchoolDays.schedulableDays()) {
            if (day == SchoolDays.FRIDAY) {
                continue;
            }
            max = Math.max(max, hoursPerDay[day.ordinal()]);
            min = Math.min(min, hoursPerDay[day.ordinal()]);
        }
        if (max <= min) {
            return 0;
        }
        final int spread = max - min;
        // MID, tuned on the real school: LOW left days two hours apart on
        // average, HIGH starts to push lessons onto Friday instead
        return (long) spread * spread * MID_COST;
    }
}
