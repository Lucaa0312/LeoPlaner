package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import at.htlleonding.leoplaner.algorithm.CostBreakdown;
import at.htlleonding.leoplaner.algorithm.CostCategory;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
import at.htlleonding.leoplaner.data.Timetable;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * The whole point of the move set: a schedule that starts with lessons on hours
 * their teacher does not work has to be able to reach one that has none.
 *
 * Runs the annealing loop's own neighbour functions greedily - if the fixed
 * cost of a run can only ever be walked down when the neighbourhood is rich
 * enough, this is where a regression in it shows up.
 */
public class TestNonWorkingHoursAreSolvable {

    private static final int ITERATIONS = 4000;

    private final SimulatedAnnealingAlgorithm algorithm =
        new SimulatedAnnealingAlgorithm();

    private static Teacher teacher(
        final long id,
        final String name,
        final int firstBlockedHour
    ) {
        final Teacher teacher = new Teacher();
        teacher.setId(id);
        teacher.setTeacherName(name);

        final List<TeacherNonWorkingHours> blocked = new ArrayList<>();
        for (final SchoolDays day : SchoolDays.values()) {
            for (int hour = firstBlockedHour; hour <= 10; hour++) {
                final TeacherNonWorkingHours nonWorking =
                    new TeacherNonWorkingHours();
                nonWorking.setDay(day);
                nonWorking.setSchoolHour(hour);
                blocked.add(nonWorking);
            }
        }
        teacher.setTeacher_non_working_hours(blocked);

        return teacher;
    }

    private static long nonWorkingCost(final CostBreakdown breakdown) {
        return breakdown.get(CostCategory.TEACHER_NON_WORKING);
    }

    /**
     * Two classes, four days of four hours each. Every day ends with a lesson
     * of a teacher who only works the first three hours, so every one of those
     * lessons starts out on an hour its teacher does not work.
     *
     * The only way out is to reorder a day - there is no free hour anywhere
     * else that helps, and each class keeps its own teachers so no clash can be
     * traded for the violation. That is exactly the move a compacted day used
     * to make impossible.
     */
    private List<Timetable> buildSchedule() {
        final SchoolDays[] days = {
            SchoolDays.MONDAY,
            SchoolDays.TUESDAY,
            SchoolDays.WEDNESDAY,
            SchoolDays.THURSDAY,
        };
        final List<Timetable> schedule = new ArrayList<>();

        for (int classNumber = 0; classNumber < 2; classNumber++) {
            final SchoolClass schoolClass = new SchoolClass();
            schoolClass.setClassName("CLASS" + classNumber);

            // own teachers per class, so a teacher clash can never stand in for
            // the violation this test is about
            final Teacher mornings = teacher(
                classNumber * 10 + 1L,
                "Mornings" + classNumber,
                4
            );
            final Teacher anytime = teacher(
                classNumber * 10 + 2L,
                "Anytime" + classNumber,
                11
            );

            final ClassSubject morningSubject = subject(
                4,
                schoolClass,
                mornings
            );
            final List<ClassSubject> fillers = List.of(
                subject(4, schoolClass, anytime),
                subject(4, schoolClass, anytime),
                subject(4, schoolClass, anytime)
            );

            final List<ClassSubjectInstance> instances = new ArrayList<>();

            for (final SchoolDays day : days) {
                for (int hour = 1; hour <= 3; hour++) {
                    instances.add(
                        new ClassSubjectInstance(
                            fillers.get(hour - 1),
                            new Period(day, hour),
                            null,
                            1
                        )
                    );
                }

                // the last hour of the day, which its teacher does not work
                instances.add(
                    new ClassSubjectInstance(
                        morningSubject,
                        new Period(day, 4),
                        null,
                        1
                    )
                );
            }

            final Timetable timetable = new Timetable(instances, schoolClass);
            algorithm.repairTimetable(timetable);
            schedule.add(timetable);
        }

        return schedule;
    }

    private static ClassSubject subject(
        final int weeklyHours,
        final SchoolClass schoolClass,
        final Teacher teacher
    ) {
        final ClassSubject classSubject = new ClassSubject();
        classSubject.setWeeklyHours(weeklyHours);
        classSubject.setSchoolClass(schoolClass);
        classSubject.setTeachers(new ArrayList<>(List.of(teacher)));
        return classSubject;
    }

    @Test
    public void theLoopCanWalkTeacherNonWorkingHoursDownToZero() {
        List<Timetable> schedule = buildSchedule();

        final CostBreakdown before = new CostBreakdown();
        algorithm.determineCost(schedule, before);
        assertTrue(
            nonWorkingCost(before) > 0,
            "the start of this test has to be broken, otherwise it proves " +
            "nothing - " +
            before.format()
        );

        final Random random = new Random(42);
        long currentCost = algorithm.determineCost(schedule);

        for (int iteration = 0; iteration < ITERATIONS; iteration++) {
            final int classIndex = random.nextInt(schedule.size());
            final Timetable current = schedule.get(classIndex);
            final int size = current.getClassSubjectInstances().size();

            final int first = random.nextInt(size);
            int second;
            do {
                second = random.nextInt(size);
            } while (second == first);

            if (
                current
                    .getClassSubjectInstances()
                    .get(first)
                    .getPeriod()
                    .isLunchBreak() ||
                current
                    .getClassSubjectInstances()
                    .get(second)
                    .getPeriod()
                    .isLunchBreak()
            ) {
                continue;
            }

            final Timetable next = algorithm.chooseRandomNeighborFunction(
                first,
                second,
                current,
                schedule
            );
            algorithm.repairTimetable(next);

            final List<Timetable> nextSchedule = new ArrayList<>(schedule);
            nextSchedule.set(classIndex, next);
            final long nextCost = algorithm.determineCost(nextSchedule);

            // greedy, so nothing but the reachability of the move set is
            // being tested here
            if (nextCost <= currentCost) {
                schedule = nextSchedule;
                currentCost = nextCost;
            }
        }

        final CostBreakdown after = new CostBreakdown();
        algorithm.determineCost(schedule, after);

        assertEquals(
            0,
            nonWorkingCost(after),
            "left over: " +
            String.join(
                ", ",
                algorithm.describeNonWorkingViolations(schedule)
            )
        );
    }
}
