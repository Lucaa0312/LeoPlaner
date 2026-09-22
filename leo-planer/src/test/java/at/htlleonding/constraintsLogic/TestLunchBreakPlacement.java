package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.data.TimetableManager;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalInt;
import org.junit.jupiter.api.Test;

/**
 * The lunch break is recomputed on every repair instead of being carried
 * along, so these check where a repair puts it - plain unit tests, no Quarkus
 * needed, the repair only touches the timetable it is handed.
 */
public class TestLunchBreakPlacement {

    private final SimulatedAnnealingAlgorithm algorithm =
        new SimulatedAnnealingAlgorithm();

    /** durations, in order, all on Monday starting at the first hour */
    private static Timetable dayOf(final int... durations) {
        final List<ClassSubjectInstance> instances = new ArrayList<>();
        int hour = TimetableManager.FIRST_SCHOOL_HOUR;

        for (final int duration : durations) {
            instances.add(
                new ClassSubjectInstance(
                    new ClassSubject(),
                    new Period(SchoolDays.MONDAY, hour),
                    null,
                    duration
                )
            );
            hour += duration;
        }

        return new Timetable(instances);
    }

    private static OptionalInt lunchBreakHour(final Timetable timetable) {
        return timetable
            .getClassSubjectInstances()
            .stream()
            .filter(csi -> csi.getPeriod().isLunchBreak())
            .mapToInt(csi -> csi.getPeriod().getSchoolHour())
            .findFirst();
    }

    @Test
    public void dayOfSixHoursOrLessGetsNoBreak() {
        final Timetable timetable = dayOf(1, 1, 1, 1, 1, 1);
        algorithm.repairTimetable(timetable);

        assertTrue(lunchBreakHour(timetable).isEmpty());
    }

    @Test
    public void eightSingleHoursBreakInTheMiddle() {
        final Timetable timetable = dayOf(1, 1, 1, 1, 1, 1, 1, 1);
        algorithm.repairTimetable(timetable);

        assertEquals(5, lunchBreakHour(timetable).getAsInt());
    }

    @Test
    public void doublePeriodOverTheMiddleShiftsTheBreakButDoesNotSplitIt() {
        // hours 4 and 5 are one lesson, so the break has to dodge to hour 4
        final Timetable timetable = dayOf(1, 1, 1, 2, 1, 1, 1);
        algorithm.repairTimetable(timetable);

        assertEquals(4, lunchBreakHour(timetable).getAsInt());
    }

    @Test
    public void breakIsRecomputedInsteadOfDriftingToTheFirstHour() {
        final Timetable timetable = dayOf(1, 1, 1, 1, 1, 1, 1, 1);
        algorithm.repairTimetable(timetable);

        // what used to ratchet: a break pinned to the first hour survived
        // every later repair
        lunchBreakHour(timetable); // placed at 5 by the assertion above
        timetable
            .getClassSubjectInstances()
            .stream()
            .filter(csi -> csi.getPeriod().isLunchBreak())
            .forEach(csi -> csi.getPeriod().setSchoolHour(1));

        algorithm.repairTimetable(timetable);

        assertEquals(5, lunchBreakHour(timetable).getAsInt());
    }

    @Test
    public void offCentreBreakCostsMoreThanACentredOne() {
        final int lessonHours = 8;
        final int centred = TimetableManager.idealLunchBreakHour(lessonHours);

        assertEquals(
            0,
            algorithm.determineCostForLunchBreakPosition(centred, lessonHours)
        );
        assertTrue(
            algorithm.determineCostForLunchBreakPosition(
                centred - 1,
                lessonHours
            ) <
            algorithm.determineCostForLunchBreakPosition(
                centred - 3,
                lessonHours
            )
        );
        assertEquals(
            0,
            algorithm.determineCostForLunchBreakPosition(null, lessonHours)
        );
    }
}
