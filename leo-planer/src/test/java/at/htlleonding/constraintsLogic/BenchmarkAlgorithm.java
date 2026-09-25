package at.htlleonding.constraintsLogic;

import at.htlleonding.leoplaner.algorithm.CostBreakdown;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonPreferredHours;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.data.TimetableManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

/**
 * Before/after benchmark for the cost function and the move path on a
 * synthetic school (40 classes, 100 teachers). Not part of the suite: remove
 * the @Disabled and run with -Dtest=BenchmarkAlgorithm. The printed checksum
 * must stay the same across a refactoring that is not meant to change costs.
 */
@Disabled("benchmark, run by hand")
public class BenchmarkAlgorithm {

    private static final int CLASSES = 40;
    private static final int TEACHERS = 100;
    private static final int[] HOURS = { 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2 };

    private final SimulatedAnnealingAlgorithm algorithm =
        new SimulatedAnnealingAlgorithm();

    private List<Timetable> buildSchool(final long seed) {
        final Random random = new Random(seed);
        final SchoolDays[] days = SchoolDays.schedulableDays();

        final List<Teacher> teachers = new ArrayList<>();
        for (int t = 0; t < TEACHERS; t++) {
            final Teacher teacher = new Teacher();
            teacher.setId((long) t + 1);
            teacher.setTeacherName("T" + t);
            final List<TeacherNonWorkingHours> nonWorking = new ArrayList<>();
            final List<TeacherNonPreferredHours> nonPreferred =
                new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                final TeacherNonWorkingHours h = new TeacherNonWorkingHours();
                h.setDay(days[random.nextInt(days.length)]);
                h.setSchoolHour(random.nextInt(1, 11));
                nonWorking.add(h);
            }
            for (int i = 0; i < 5; i++) {
                final TeacherNonPreferredHours h =
                    new TeacherNonPreferredHours();
                h.setDay(days[random.nextInt(days.length)]);
                h.setSchoolHour(random.nextInt(1, 11));
                nonPreferred.add(h);
            }
            teacher.setTeacher_non_working_hours(nonWorking);
            teacher.setTeacher_non_preferred_hours(nonPreferred);
            teachers.add(teacher);
        }

        final List<Room> labs = new ArrayList<>();
        for (int r = 0; r < 5; r++) {
            final Room lab = new Room();
            lab.setId((long) 5000 + r);
            labs.add(lab);
        }

        final List<Timetable> school = new ArrayList<>();
        for (int c = 0; c < CLASSES; c++) {
            final SchoolClass schoolClass = new SchoolClass();
            schoolClass.setId((long) c + 1);
            schoolClass.setClassName("C" + c);
            final Room classRoom = new Room();
            classRoom.setId((long) 1000 + c);

            final int[] dayHours = new int[days.length];
            final List<ClassSubjectInstance> csis = new ArrayList<>();

            for (int s = 0; s < HOURS.length; s++) {
                final ClassSubject cs = new ClassSubject();
                cs.setId((long) c * 100 + s);
                cs.setSchoolClass(schoolClass);
                cs.setWeeklyHours(HOURS[s]);
                cs.setBetterDoublePeriod(random.nextInt(10) < 3);
                final List<Teacher> csTeachers = new ArrayList<>();
                csTeachers.add(teachers.get(random.nextInt(TEACHERS)));
                if (random.nextInt(10) < 2) {
                    csTeachers.add(teachers.get(random.nextInt(TEACHERS)));
                }
                cs.setTeachers(csTeachers);
                final Room room = random.nextInt(10) == 0
                    ? labs.get(random.nextInt(labs.size()))
                    : classRoom;

                int left = HOURS[s];
                while (left > 0) {
                    final int duration = Math.min(left, random.nextInt(1, 3));
                    int day = 0;
                    for (int d = 1; d < days.length; d++) {
                        if (dayHours[d] < dayHours[day]) {
                            day = d;
                        }
                    }
                    csis.add(
                        new ClassSubjectInstance(
                            cs,
                            new Period(days[day], dayHours[day] + 1),
                            room,
                            duration
                        )
                    );
                    dayHours[day] += duration;
                    left -= duration;
                }
            }

            final Timetable timetable = new Timetable(csis, schoolClass);
            algorithm.repairTimetable(timetable);
            school.add(timetable);
        }
        return school;
    }

    /** deterministic variants: seeded inserts and swaps, no internal RNG */
    private List<List<Timetable>> variants(final List<Timetable> base) {
        final Random random = new Random(7);
        final List<List<Timetable>> result = new ArrayList<>();
        List<Timetable> current = base;

        for (int v = 0; v < 30; v++) {
            final List<Timetable> next = new ArrayList<>(current);
            final int c = random.nextInt(next.size());
            final Timetable tt = next.get(c);
            final int size = tt.getClassSubjectInstances().size();
            final int i1 = random.nextInt(size);
            final int i2 = random.nextInt(size);
            Timetable moved;
            if (v % 2 == 0) {
                moved = TimetableManager.switchTwoClassSubjectInstancesAndReturn(
                    tt,
                    i1,
                    i2
                );
            } else {
                moved = TimetableManager.insertClassSubjectInstanceAndReturn(
                    tt,
                    i1,
                    new Period(
                        SchoolDays.schedulableDays()[random.nextInt(5)],
                        random.nextInt(1, 6)
                    )
                );
            }
            if (v % 5 != 4) {
                algorithm.repairTimetable(moved); // every 5th left unrepaired: clashes, late hours
            }
            next.set(c, moved);
            result.add(next);
            current = next;
        }
        return result;
    }

    private String anneal(final double t0, final double rate) {
        List<Timetable> school = buildSchool(42);
        SimulatedAnnealingAlgorithm.setTemperature(t0);
        long cost = algorithm.determineCost(school);
        final Random random = new Random();
        long iterations = 0;
        final long start = System.nanoTime();

        while (algorithm.getTemperature() > 0.1) {
            final int c = random.nextInt(school.size());
            final Timetable tt = school.get(c);
            final int size = tt.getClassSubjectInstances().size();
            final int i1 = random.nextInt(size);
            int i2;
            do {
                i2 = random.nextInt(size);
            } while (i2 == i1);
            if (
                tt.getClassSubjectInstances().get(i1).getPeriod().isLunchBreak() ||
                tt.getClassSubjectInstances().get(i2).getPeriod().isLunchBreak()
            ) {
                continue;
            }
            final Timetable next = algorithm.chooseRandomNeighborFunction(i1, i2, tt, school);
            algorithm.repairTimetable(next);
            final List<Timetable> nextSchool = new ArrayList<>(school);
            nextSchool.set(c, next);
            final long nextCost = algorithm.determineCost(nextSchool);
            if (algorithm.acceptSolution(cost, nextCost)) {
                school = nextSchool;
                cost = nextCost;
            }
            SimulatedAnnealingAlgorithm.setTemperature(algorithm.getTemperature() * rate);
            iterations++;
        }

        final CostBreakdown breakdown = new CostBreakdown();
        algorithm.determineCost(school, breakdown);
        return String.format(
            "T0=%.0f rate=%s iterations=%d time=%.1fs %s",
            t0, rate, iterations, (System.nanoTime() - start) / 1e9, breakdown.format()
        );
    }

    @Test
    void coolingComparison() {
        for (int run = 0; run < 2; run++) {
            System.out.println("BENCH old  " + anneal(1000, 0.9994));
            System.out.println("BENCH new  " + anneal(100, 0.9999));
        }
    }

    @Test
    void benchmark() {
        final List<Timetable> school = buildSchool(42);

        // checksums
        final CostBreakdown breakdown = new CostBreakdown();
        final long baseCost = algorithm.determineCost(school, breakdown);
        System.out.println("BENCH base cost " + baseCost + " " + breakdown.format());
        long checksum = baseCost;
        int v = 0;
        for (final List<Timetable> variant : variants(school)) {
            final CostBreakdown b = new CostBreakdown();
            final long cost = algorithm.determineCost(variant, b);
            if (cost != b.total()) {
                System.out.println("BENCH breakdown mismatch in variant " + v);
            }
            System.out.println("BENCH variant " + v++ + " " + b.format());
            checksum = checksum * 31 + cost;
        }
        System.out.println("BENCH checksum " + checksum);

        // cost evaluation
        for (int i = 0; i < 300; i++) {
            algorithm.determineCost(school);
        }
        final int evals = 2000;
        long start = System.nanoTime();
        long sink = 0;
        for (int i = 0; i < evals; i++) {
            sink += algorithm.determineCost(school);
        }
        final double evalMicros = (System.nanoTime() - start) / 1000.0 / evals;
        System.out.printf("BENCH determineCost: %.1f us/call (sink %d)%n", evalMicros, sink);

        // one annealing iteration without the bookkeeping: move + repair + cost
        final Random random = new Random(1);
        final int iterations = 3000;
        int done = 0;
        start = System.nanoTime();
        while (done < iterations) {
            final int c = random.nextInt(school.size());
            final Timetable tt = school.get(c);
            final int size = tt.getClassSubjectInstances().size();
            final int i1 = random.nextInt(size);
            int i2;
            do {
                i2 = random.nextInt(size);
            } while (i2 == i1);
            if (
                tt.getClassSubjectInstances().get(i1).getPeriod().isLunchBreak() ||
                tt.getClassSubjectInstances().get(i2).getPeriod().isLunchBreak()
            ) {
                continue;
            }
            final Timetable next = algorithm.chooseRandomNeighborFunction(
                i1,
                i2,
                tt,
                school
            );
            algorithm.repairTimetable(next);
            final List<Timetable> nextSchool = new ArrayList<>(school);
            nextSchool.set(c, next);
            sink += algorithm.determineCost(nextSchool);
            done++;
        }
        final double iterMicros =
            (System.nanoTime() - start) / 1000.0 / iterations;
        System.out.printf("BENCH move+repair+1 cost: %.1f us/iteration (sink %d)%n", iterMicros, sink);
    }
}
