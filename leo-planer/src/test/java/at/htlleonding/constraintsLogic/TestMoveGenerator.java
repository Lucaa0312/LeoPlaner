package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.data.TimetableManager;
import at.htlleonding.leoplaner.repository.TimetableService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

/**
 * The moves the annealer can actually make. A run used to sit on the same
 * TEACHER_NON_WORKING cost forever because the generator could only append a
 * lesson to the end of a day and never looked at non working hours at all.
 */
public class TestMoveGenerator {

    private final SimulatedAnnealingAlgorithm algorithm =
        new SimulatedAnnealingAlgorithm();

    private static Teacher teacher(final long id, final String name) {
        final Teacher teacher = new Teacher();
        teacher.setId(id);
        teacher.setTeacherName(name);
        teacher.setTeacher_non_working_hours(new ArrayList<>());
        return teacher;
    }

    private static void blockAllBut(
        final Teacher teacher,
        final SchoolDays freeDay,
        final int freeHour
    ) {
        final List<TeacherNonWorkingHours> blocked = new ArrayList<>();

        for (final SchoolDays day : SchoolDays.values()) {
            for (
                int hour = TimetableManager.FIRST_SCHOOL_HOUR;
                hour <= TimetableManager.LAST_SCHOOL_HOUR;
                hour++
            ) {
                if (day == freeDay && hour == freeHour) {
                    continue;
                }

                final TeacherNonWorkingHours nonWorking =
                    new TeacherNonWorkingHours();
                nonWorking.setDay(day);
                nonWorking.setSchoolHour(hour);
                blocked.add(nonWorking);
            }
        }

        teacher.setTeacher_non_working_hours(blocked);
    }

    private static ClassSubject subject(final int weeklyHours, final Teacher... teachers) {
        final ClassSubject classSubject = new ClassSubject();
        classSubject.setWeeklyHours(weeklyHours);
        classSubject.setTeachers(new ArrayList<>(List.of(teachers)));
        return classSubject;
    }

    private static ClassSubjectInstance lesson(
        final ClassSubject classSubject,
        final SchoolDays day,
        final int hour,
        final int duration
    ) {
        return new ClassSubjectInstance(
            classSubject,
            new Period(day, hour),
            null,
            duration
        );
    }

    private static List<Integer> hoursOnDay(
        final Timetable timetable,
        final SchoolDays day
    ) {
        return timetable
            .getClassSubjectInstances()
            .stream()
            .filter(csi -> csi.getPeriod().getSchoolDays() == day)
            .filter(csi -> !csi.getPeriod().isLunchBreak())
            .map(csi -> csi.getPeriod().getSchoolHour())
            .sorted()
            .collect(Collectors.toList());
    }

    @Test
    public void insertionOffersEveryPositionInTheDayNotOnlyTheTail() {
        // a compacted monday: one hour, a double period, one hour
        final Timetable timetable = new Timetable(
            new ArrayList<>(
                List.of(
                    lesson(subject(1), SchoolDays.MONDAY, 1, 1),
                    lesson(subject(2), SchoolDays.MONDAY, 2, 2),
                    lesson(subject(1), SchoolDays.MONDAY, 4, 1),
                    lesson(subject(1), SchoolDays.TUESDAY, 1, 1)
                )
            )
        );

        final List<Integer> candidates = TimetableManager
            .returnAllInsertionPeriodsOnCertainDay(
                timetable,
                SchoolDays.MONDAY,
                3, // the tuesday lesson is the one being moved
                Map.of()
            )
            .stream()
            .map(Period::getSchoolHour)
            .sorted()
            .collect(Collectors.toList());

        // in front of each of the three lessons, and behind the last one
        assertEquals(List.of(1, 2, 4, 5), candidates);
    }

    @Test
    public void insertionActuallyReordersADay() {
        final ClassSubject first = subject(1);
        final ClassSubject second = subject(1);
        final ClassSubject third = subject(1);

        final Timetable timetable = new Timetable(
            new ArrayList<>(
                List.of(
                    lesson(first, SchoolDays.MONDAY, 1, 1),
                    lesson(second, SchoolDays.MONDAY, 2, 1),
                    lesson(third, SchoolDays.MONDAY, 3, 1)
                )
            )
        );

        final Timetable moved =
            TimetableManager.insertClassSubjectInstanceAndReturn(
                timetable,
                2,
                new Period(SchoolDays.MONDAY, 1)
            );
        algorithm.repairTimetable(moved);

        assertEquals(List.of(1, 2, 3), hoursOnDay(moved, SchoolDays.MONDAY));
        assertEquals(
            third,
            moved.getClassSubjectInstances().get(2).getClassSubject()
        );
        assertEquals(
            1,
            moved.getClassSubjectInstances().get(2).getPeriod().getSchoolHour()
        );
    }

    @Test
    public void changePeriodStaysOffNonWorkingHoursWhenItCan() {
        final Teacher blocked = teacher(1L, "Blocked");
        blockAllBut(blocked, SchoolDays.TUESDAY, 1);

        final ClassSubject taught = subject(1, blocked);
        final Timetable timetable = new Timetable(
            new ArrayList<>(
                List.of(
                    lesson(taught, SchoolDays.MONDAY, 1, 1),
                    lesson(subject(1), SchoolDays.MONDAY, 2, 1)
                )
            )
        );

        final Timetable moved = algorithm.changePeriod(
            timetable,
            0,
            List.of(timetable)
        );
        final Period period = moved
            .getClassSubjectInstances()
            .get(0)
            .getPeriod();

        assertEquals(SchoolDays.TUESDAY, period.getSchoolDays());
        assertEquals(1, period.getSchoolHour());
    }

    @Test
    public void changePeriodStillMovesWhenEveryHourIsBlocked() {
        final Teacher blocked = teacher(2L, "Fully blocked");
        // free day that does not exist in the candidate days, so nothing at all
        // survives the strict filter
        blockAllBut(blocked, SchoolDays.SATURDAY, 1);

        final ClassSubject taught = subject(1, blocked);
        final Timetable timetable = new Timetable(
            new ArrayList<>(
                List.of(
                    lesson(taught, SchoolDays.MONDAY, 1, 1),
                    lesson(subject(1), SchoolDays.MONDAY, 2, 1)
                )
            )
        );

        final Timetable moved = algorithm.changePeriod(
            timetable,
            0,
            List.of(timetable)
        );

        assertNotNull(moved);
        assertEquals(2, moved.getClassSubjectInstances().size());
    }

    @Test
    public void swapExchangesEqualDurationsAndLeavesUnequalOnesAlone() {
        final ClassSubject first = subject(1);
        final ClassSubject second = subject(1);

        final Timetable equal = new Timetable(
            new ArrayList<>(
                List.of(
                    lesson(first, SchoolDays.MONDAY, 1, 1),
                    lesson(second, SchoolDays.MONDAY, 2, 1)
                )
            )
        );
        final Timetable swapped = algorithm.swapPeriods(equal, 0, 1);

        assertEquals(
            2,
            swapped.getClassSubjectInstances().get(0).getPeriod().getSchoolHour()
        );
        assertEquals(
            1,
            swapped.getClassSubjectInstances().get(1).getPeriod().getSchoolHour()
        );

        final Timetable unequal = new Timetable(
            new ArrayList<>(
                List.of(
                    lesson(first, SchoolDays.MONDAY, 1, 1),
                    lesson(second, SchoolDays.MONDAY, 2, 2)
                )
            )
        );
        final Timetable rejected = algorithm.swapPeriods(unequal, 0, 1);

        // the swap would overlap on hour 2, so it is handed back untouched
        assertEquals(
            1,
            rejected.getClassSubjectInstances().get(0).getPeriod().getSchoolHour()
        );
        assertEquals(
            2,
            rejected.getClassSubjectInstances().get(1).getPeriod().getSchoolHour()
        );
    }

    @Test
    public void seededScheduleKeepsOffNonWorkingHours() {
        final Teacher morningsOnly = teacher(3L, "Mornings only");
        final List<TeacherNonWorkingHours> blocked = new ArrayList<>();

        for (final SchoolDays day : SchoolDays.values()) {
            for (int hour = 4; hour <= TimetableManager.LAST_SCHOOL_HOUR; hour++) {
                final TeacherNonWorkingHours nonWorking =
                    new TeacherNonWorkingHours();
                nonWorking.setDay(day);
                nonWorking.setSchoolHour(hour);
                blocked.add(nonWorking);
            }
        }
        morningsOnly.setTeacher_non_working_hours(blocked);

        final List<ClassSubject> subjects = List.of(
            subject(6, morningsOnly),
            subject(4, morningsOnly),
            subject(5)
        );

        final List<ClassSubjectInstance> instances = new TimetableService()
            .createRandomInstances(subjects, null);

        assertEquals(
            15,
            instances.stream().mapToInt(ClassSubjectInstance::getDuration).sum()
        );

        for (final ClassSubjectInstance csi : instances) {
            if (!csi.getClassSubject().getTeachers().contains(morningsOnly)) {
                continue;
            }

            for (int i = 0; i < csi.getDuration(); i++) {
                assertTrue(
                    csi.getPeriod().getSchoolHour() + i <= 3,
                    "seeded onto a non working hour: " +
                    csi.getPeriod().getSchoolDays() +
                    "-" +
                    (csi.getPeriod().getSchoolHour() + i)
                );
            }
        }
    }

    @Test
    public void violationsAreNamedInTheLog() {
        final Teacher blocked = teacher(4L, "Blocked");
        blockAllBut(blocked, SchoolDays.TUESDAY, 1);

        final Timetable timetable = new Timetable(
            new ArrayList<>(
                List.of(lesson(subject(1, blocked), SchoolDays.MONDAY, 1, 1))
            )
        );

        final List<String> described = algorithm.describeNonWorkingViolations(
            List.of(timetable)
        );

        assertEquals(1, described.size());
        assertTrue(described.get(0).contains("Blocked"));
        assertTrue(described.get(0).contains("MONDAY-1"));
        assertFalse(described.get(0).isBlank());
        assertEquals(
            Collections.emptyList(),
            algorithm.describeNonWorkingViolations(List.of(new Timetable(new ArrayList<>(Set.of()))))
        );
    }
}
