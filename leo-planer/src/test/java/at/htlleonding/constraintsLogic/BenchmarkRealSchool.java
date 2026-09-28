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
        // quality the cost function does not look at (yet)
        int lateStarts = 0;
        int sameDayRepeats = 0;
        int roomChanges = 0;
        int splitTwoHourLessons = 0;
        int lateEnds = 0;
        int spreadSum = 0;
        int fridayHours = 0;
        int classes = 0;
        int twoHourLessons = 0;
        for (final var entry : timetables.entrySet()) {
            final var schoolClass = schedule.getClasses().stream()
                    .filter(c -> c.getClassName().equals(entry.getKey())).findFirst().orElseThrow();
            final var byDay = new java.util.TreeMap<at.htlleonding.leoplaner.data.SchoolDays,
                    java.util.List<at.htlleonding.leoplaner.data.ClassSubjectInstance>>();
            for (final var csi : entry.getValue().getClassSubjectInstances()) {
                if (!csi.getPeriod().isLunchBreak()) {
                    byDay.computeIfAbsent(csi.getPeriod().getSchoolDays(), d -> new java.util.ArrayList<>()).add(csi);
                }
            }
            classes++;
            final int[] perDay = new int[5];
            for (final var entry2 : byDay.entrySet()) {
                int end = 0;
                for (final var csi : entry2.getValue()) {
                    perDay[entry2.getKey().ordinal()] += csi.getDuration();
                    end = Math.max(end, csi.getPeriod().getSchoolHour() + csi.getDuration() - 1);
                }
                if (end - schoolClass.getFirstHour() + 1 > 8) {
                    lateEnds++;
                }
            }
            int max = 0;
            int min = 99;
            for (int d = 0; d < 4; d++) {
                max = Math.max(max, perDay[d]);
                min = Math.min(min, perDay[d]);
            }
            spreadSum += max - min;
            fridayHours += perDay[4];
            for (final var day : byDay.values()) {
                day.sort(java.util.Comparator.comparingInt(c -> c.getPeriod().getSchoolHour()));
                if (day.getFirst().getPeriod().getSchoolHour() > schoolClass.getFirstHour()
                        && day.getFirst().getClassSubject().getParallelGroup() == null) {
                    lateStarts++;
                }
                final var seen = new java.util.HashMap<Object, Integer>();
                for (final var csi : day) {
                    final Integer end = seen.get(csi.getClassSubject());
                    if (end != null && end != csi.getPeriod().getSchoolHour()) {
                        sameDayRepeats++;
                    }
                    seen.put(csi.getClassSubject(), csi.getPeriod().getSchoolHour() + csi.getDuration());
                }
                for (int i = 1; i < day.size(); i++) {
                    final var a = day.get(i - 1);
                    final var b = day.get(i);
                    if (a.getPeriod().getSchoolHour() + a.getDuration() == b.getPeriod().getSchoolHour()
                            && a.getRoom() != null && b.getRoom() != null && a.getRoom() != b.getRoom()
                            && a.getClassSubject().getFixedRooms().isEmpty() && b.getClassSubject().getFixedRooms().isEmpty()) {
                        roomChanges++;
                    }
                }
            }
        }
        for (final var block : schedule.getBlocks()) {
            final var cs = block.getMembers().getFirst();
            if (cs.getWeeklyHours() == 2 && cs.getCouplingKey() != null) {
                twoHourLessons++;
                if (block.getDuration() == 1) {
                    splitTwoHourLessons++;
                }
            }
        }
        System.out.printf("BENCH shape: days past the 8th hour %d, avg Mon-Thu spread %.2f, avg Friday %.2f h%n",
                lateEnds, (double) spreadSum / classes, (double) fridayHours / classes);
        System.out.println("BENCH quality: late starts " + lateStarts + ", same lesson twice a day apart " + sameDayRepeats
                + ", room changes between back-to-back lessons without fixed room " + roomChanges
                + ", 2h lessons cut into singles " + splitTwoHourLessons / 2 + " of " + (twoHourLessons - splitTwoHourLessons / 2));
        System.out.println("BENCH rooms: lessons without room " + withoutRoom + ", double booked " + doubleBooked.size()
                + " " + doubleBooked.stream().limit(5).toList());
    }
}
