package at.htlleonding.constraintsLogic;

import at.htlleonding.leoplaner.algorithm.Schedule;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import java.util.Random;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

/**
 * Runs the solver on the real school and prints where the cost ends up. Too
 * slow for every build: remove the @Disabled and run with
 * -Dtest=BenchmarkRealSchool.
 */
@Disabled("benchmark, run by hand")
public class BenchmarkRealSchool {

    @Test
    void anneal() throws Exception {
        final long iterations = Long.getLong("iterations", 2_000_000);
        final RealSchool school = RealSchool.load();
        final Schedule schedule = Schedule.of(school.classSubjects);
        System.out.println("BENCH blocks " + schedule.getBlocks().size() + " classes " + schedule.getClasses().size());

        long start = System.nanoTime();
        schedule.construct(new Random(Long.getLong("seed", 1)));
        System.out.printf("BENCH construct %.0f ms, hard %d, %s%n", (System.nanoTime() - start) / 1e6,
                schedule.hardViolations(), schedule.breakdown().format());

        start = System.nanoTime();
        final double rate = Math.pow(0.1 / 100, 1.0 / iterations);
        SimulatedAnnealingAlgorithm.anneal(schedule, iterations, 100, rate, new Random(Long.getLong("seed", 1) + 1));
        final double seconds = (System.nanoTime() - start) / 1e9;
        System.out.printf("BENCH anneal %d iterations in %.1f s (%.1f us/it), hard %d, %s%n", iterations, seconds,
                seconds * 1e6 / iterations, schedule.hardViolations(), schedule.breakdown().format());
        schedule.describeHardViolations().forEach(v -> System.out.println("BENCH   " + v));

        // rooms as the views hand them out: every lesson one, never two lessons in one
        final var timetables = schedule.toTimetables(schedule.snapshot(), schedule.getTotalCost());
        long withoutRoom = 0;
        final java.util.Map<String, String> taken = new java.util.HashMap<>();
        final java.util.Set<String> doubleBooked = new java.util.TreeSet<>();
        final java.util.Set<Object> seenBlocks = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (final var entry : timetables.entrySet()) {
            for (final var csi : entry.getValue().getClassSubjectInstances()) {
                if (csi.getPeriod().isLunchBreak()) {
                    continue;
                }
                if (csi.getRoom() == null) {
                    withoutRoom++;
                    continue;
                }
                for (int i = 0; i < csi.getDuration(); i++) {
                    final String key = csi.getRoom().getNameShort() + "@" + csi.getPeriod().getSchoolDays() + "-"
                            + (csi.getPeriod().getSchoolHour() + i);
                    final String lesson = csi.getClassSubject().getCouplingKey();
                    final String previous = taken.putIfAbsent(key, lesson);
                    if (previous != null && !previous.equals(lesson)) {
                        doubleBooked.add(key + " " + previous + "/" + lesson);
                    }
                }
            }
        }
        System.out.println("BENCH rooms: lessons without room " + withoutRoom + ", double booked " + doubleBooked.size()
                + " " + doubleBooked.stream().limit(5).toList());
    }
}
