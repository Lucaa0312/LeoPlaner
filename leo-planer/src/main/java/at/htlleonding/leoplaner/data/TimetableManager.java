package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public class TimetableManager {

    public static final int FIRST_SCHOOL_HOUR = 1;
    public static final int LAST_SCHOOL_HOUR = 10;

    public static ArrayList<Period> returnAllFreePeriodsOnCertainDay(
        final Timetable timetable,
        final SchoolDays schoolDay,
        final int duration
    ) {
        return returnAllFreePeriodsOnCertainDay(
            timetable,
            schoolDay,
            duration,
            Collections.emptyMap()
        );
    }

    /**
     * Free periods of this class that are also free for the teachers involved.
     * blockedHours holds the hours the teachers already teach in OTHER classes,
     * so a move can never double-book them.
     */
    public static ArrayList<Period> returnAllFreePeriodsOnCertainDay(
        final Timetable timetable,
        final SchoolDays schoolDay,
        final int duration,
        final Map<SchoolDays, Set<Integer>> blockedHours
    ) {
        final ArrayList<Period> result = new ArrayList<>();
        final Set<Integer> blockedOnDay = blockedHours.getOrDefault(
            schoolDay,
            Collections.emptySet()
        );
        final List<ClassSubjectInstance> csisOnDay = timetable
            .getClassSubjectInstances()
            .stream()
            .filter(e -> e.getPeriod().getSchoolDays() == schoolDay)
            .toList();

        // latest possible start hour so duration fits
        for (
            int startHour = FIRST_SCHOOL_HOUR;
            startHour <= LAST_SCHOOL_HOUR - duration + 1;
            startHour++
        ) {
            boolean isFree = true;

            // check against ALL existing CSIs
            for (final ClassSubjectInstance csi : csisOnDay) {
                final int occupiedStart = csi.getPeriod().getSchoolHour();
                final int occupiedEnd = occupiedStart + csi.getDuration() - 1;

                final int candidateStart = startHour;
                final int candidateEnd = startHour + duration - 1;

                // overlap check
                if (
                    candidateStart <= occupiedEnd &&
                    candidateEnd >= occupiedStart
                ) {
                    isFree = false;
                    break;
                }
            }

            if (isFree) {
                for (int i = 0; i < duration; i++) {
                    if (blockedOnDay.contains(startHour + i)) {
                        isFree = false; // a teacher of this lesson is busy
                        break;
                    }
                }
            }

            if (isFree) {
                result.add(new Period(schoolDay, startHour));
            }
        }

        return result;
    }

    /**
     * Collects every hour the given teachers already teach, looking at all
     * timetables except the one currently being changed. Used to keep a teacher
     * from being booked into two classes at the same time.
     */
    public static Map<SchoolDays, Set<Integer>> collectTeacherOccupiedHours(
        final Collection<Timetable> schoolSchedule,
        final Timetable timetableToIgnore,
        final Set<Long> teacherIds
    ) {
        final Map<SchoolDays, Set<Integer>> occupied = new HashMap<>();

        if (teacherIds.isEmpty()) {
            return occupied;
        }

        for (final Timetable timetable : schoolSchedule) {
            if (timetable == timetableToIgnore) {
                continue; // the class we are moving inside of
            }

            for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                if (csi.getPeriod().isLunchBreak()) {
                    continue;
                }

                if (Collections.disjoint(teacherIdsOf(csi), teacherIds)) {
                    continue; // none of our teachers teaches this lesson
                }

                final Set<Integer> hours = occupied.computeIfAbsent(
                    csi.getPeriod().getSchoolDays(),
                    day -> new HashSet<>()
                );

                for (int i = 0; i < csi.getDuration(); i++) {
                    hours.add(csi.getPeriod().getSchoolHour() + i);
                }
            }
        }

        return occupied;
    }

    public static Set<Long> teacherIdsOf(final ClassSubjectInstance csi) {
        if (
            csi == null ||
            csi.getClassSubject() == null ||
            csi.getClassSubject().getTeachers() == null
        ) {
            return Collections.emptySet();
        }

        final Set<Long> ids = new HashSet<>();
        for (final Teacher teacher : csi.getClassSubject().getTeachers()) {
            if (teacher != null && teacher.getId() != null) {
                ids.add(teacher.getId());
            }
        }
        return ids;
    }

    public static Timetable giveClassSubjectRandomPeriodAndReturn(
        final Timetable timetable,
        final int index
    ) {
        return giveClassSubjectRandomPeriodAndReturn(
            timetable,
            index,
            Collections.emptyMap()
        );
    }

    public static Timetable giveClassSubjectRandomPeriodAndReturn(
        final Timetable timetable,
        final int index,
        final Map<SchoolDays, Set<Integer>> blockedHours
    ) {
        final Random random = new Random();
        final ArrayList<Period> allFreePeriods = new ArrayList<>();
        final int duration = timetable
            .getClassSubjectInstances()
            .get(index)
            .getDuration();

        for (final SchoolDays schoolDay : SchoolDays.schedulableDays()) {
            allFreePeriods.addAll(
                returnAllFreePeriodsOnCertainDay(
                    timetable,
                    schoolDay,
                    duration,
                    blockedHours
                )
            );
        }

        if (allFreePeriods.isEmpty()) {
            // every remaining slot would clash with this lesson's teachers, so
            // there is no legal move - hand back an unchanged copy instead of
            // forcing an illegal one
            return cloneCurrentTimeTable(timetable);
        }

        return switchClassSubjectInstancePeriodAndReturn(
            timetable,
            index,
            allFreePeriods.get(random.nextInt(allFreePeriods.size()))
        );
    }

    public static Timetable switchClassSubjectInstancePeriodAndReturn(
        final Timetable timetable,
        final int index,
        final Period newPeriod
    ) {
        final Timetable clonedTimetable = cloneCurrentTimeTable(timetable);
        final ClassSubjectInstance csi = clonedTimetable
            .getClassSubjectInstances()
            .get(index);
        csi.setPeriod(newPeriod);
        return clonedTimetable;
    }

    public static boolean hasLunchBreakOnDay(
        final Timetable timetable,
        final SchoolDays schoolday
    ) {
        return timetable
            .getClassSubjectInstances()
            .stream()
            .anyMatch(
                e ->
                    e.getPeriod().getSchoolDays() == schoolday &&
                    e.getPeriod().isLunchBreak()
            );
    }

    public static void implementRandomLunchBreakOnDay(
        final Timetable timetable,
        final SchoolDays schoolday
    ) {
        if (hasLunchBreakOnDay(timetable, schoolday)) {
            return; // a day gets exactly one lunch break
        }

        final List<ClassSubjectInstance> instancesOnDay = timetable
            .getClassSubjectInstances()
            .stream()
            .filter(e -> e.getPeriod().getSchoolDays() == schoolday)
            .toList();

        if (instancesOnDay.isEmpty()) {
            return; // nothing to break up
        }

        final int LOWEST_SCHOOLHOUR = instancesOnDay
            .stream()
            .mapToInt(e -> e.getPeriod().getSchoolHour())
            .min()
            .getAsInt(); // first occupied hour of the day
        final int HIGHEST_SCHOOLHOUR = instancesOnDay
            .stream()
            .mapToInt(e -> e.getPeriod().getSchoolHour() + e.getDuration() - 1)
            .max()
            .getAsInt(); // last occupied hour of the day, durations included

        // the break needs at least two hours of class before it
        final int earliestBreakHour = LOWEST_SCHOOLHOUR + 2;
        final int latestBreakHour = HIGHEST_SCHOOLHOUR;

        if (earliestBreakHour > latestBreakHour) {
            return; // day is too short to place a break in
        }

        final Random random = new Random();
        final int breakHour = random.nextInt(
            earliestBreakHour,
            latestBreakHour + 1
        );

        final boolean LUNCHBREAK = true;

        // everything that starts at or spans over the break hour moves one hour
        // later - filtering on the start hour alone would drop the break into
        // the middle of a double or triple period
        instancesOnDay
            .stream()
            .filter(
                e ->
                    e.getPeriod().getSchoolHour() + e.getDuration() - 1 >=
                    breakHour
            )
            .forEach(e ->
                e.getPeriod().setSchoolHour(e.getPeriod().getSchoolHour() + 1)
            );

        final Period lunchBreakPeriod = new Period(
            schoolday,
            breakHour,
            LUNCHBREAK
        );

        // the shift above already frees breakHour; this only guards against a
        // leftover overlap and is bounded so it can never spin forever
        while (
            lunchBreakPeriod.getSchoolHour() <= LAST_SCHOOL_HOUR &&
            !checkIfPeriodIsFreeOnDay(
                timetable,
                lunchBreakPeriod.getSchoolHour(),
                1,
                schoolday
            )
        ) {
            lunchBreakPeriod.setSchoolHour(
                lunchBreakPeriod.getSchoolHour() + 1
            );
        }

        if (lunchBreakPeriod.getSchoolHour() > LAST_SCHOOL_HOUR) {
            return; // no room left on this day, leave it without a break
        }

        timetable
            .getClassSubjectInstances()
            .add(new ClassSubjectInstance(null, lunchBreakPeriod, null, 1)); // place
        // holder
        // fake
        // csi for lunch
        // break
    }

    public static boolean checkIfPeriodIsFreeOnDay(
        final Timetable timetable,
        final int schoolHour,
        final int duration,
        final SchoolDays schoolDay
    ) {
        final List<Integer> allOccupiedHoursOnDay = new ArrayList<>();

        for (final ClassSubjectInstance csi : timetable
            .getClassSubjectInstances()
            .stream()
            .filter(e -> e.getPeriod().getSchoolDays() == schoolDay)
            .toList()) {
            for (int i = 0; i < csi.getDuration(); i++) {
                allOccupiedHoursOnDay.add(csi.getPeriod().getSchoolHour() + i);
            }
        }

        if (allOccupiedHoursOnDay.isEmpty()) {
            // entire day is free
            return true;
        }

        for (int i = 0; i < duration; i++) {
            if (allOccupiedHoursOnDay.contains(schoolHour + i)) {
                return false;
            }
        }
        return true;
    }

    public static boolean checkIfPeriodIsDoubleDay(
        final Timetable timetable,
        final SchoolDays schoolDay
    ) {
        Set<Integer> occupied = new HashSet<>();

        for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            if (csi.getPeriod().getSchoolDays() != schoolDay) continue;

            for (int i = 0; i < csi.getDuration(); i++) {
                int hour = csi.getPeriod().getSchoolHour() + i;

                if (!occupied.add(hour)) {
                    return true; // overlap
                }
            }
        }

        return false;
    }

    public static ArrayList<ClassSubjectInstance> cloneClassSubjectInstanceList(
        final Timetable timetable
    ) {
        // deep
        // copy
        // since
        // all lives on the
        // heap
        final ArrayList<ClassSubjectInstance> clonedClassSubjectInstances =
            new ArrayList<>();
        for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            final Period clonedPeriod = new Period(
                csi.getPeriod().getSchoolDays(),
                csi.getPeriod().getSchoolHour(),
                csi.getPeriod().isLunchBreak()
            );
            final ClassSubjectInstance clonedCsi = new ClassSubjectInstance(
                csi.getClassSubject(),
                clonedPeriod,
                csi.getRoom(),
                csi.getDuration()
            );
            clonedClassSubjectInstances.add(clonedCsi);
        }
        return clonedClassSubjectInstances;
    }

    public static void calculateWeeklyHours(final Timetable timetable) {
        // TODO free lunch periods not included yet
        int totalHours = 0;
        final List<String> classSubjectsUsed = new ArrayList<>();

        for (final ClassSubjectInstance instance : timetable.getClassSubjectInstances()) {
            final ClassSubject classSubject = instance.getClassSubject();

            if (!classSubjectsUsed.contains(classSubject.getId().toString())) {
                totalHours += classSubject.getWeeklyHours();
                classSubjectsUsed.add(classSubject.getId().toString());
            }
        }
        timetable.setTotalWeeklyHours(totalHours);
    }

    public static Timetable cloneCurrentTimeTable(final Timetable timetable) {
        return new Timetable(cloneClassSubjectInstanceList(timetable));
    }

    /**
     * How many hours are booked more than once, counting every extra booking.
     * A flat "is there an overlap" flag gives the algorithm no gradient: going
     * from six clashes to five would not change the cost at all, so there is
     * no downhill path out of a badly clashing teacher.
     */
    public static int countOverlappingHours(final Timetable timetable) {
        int overlaps = 0;

        for (final SchoolDays day : SchoolDays.values()) {
            final Map<Integer, Integer> bookingsPerHour = new HashMap<>();

            for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                if (csi.getPeriod().getSchoolDays() != day) {
                    continue;
                }

                for (int i = 0; i < csi.getDuration(); i++) {
                    bookingsPerHour.merge(
                        csi.getPeriod().getSchoolHour() + i,
                        1,
                        Integer::sum
                    );
                }
            }

            for (final int bookings : bookingsPerHour.values()) {
                overlaps += bookings - 1; // one booking per hour is fine
            }
        }

        return overlaps;
    }

    public static boolean timetableHasOverlap(final Timetable timetable) {
        for (SchoolDays day : SchoolDays.values()) {
            if (checkIfPeriodIsDoubleDay(timetable, day)) {
                return true;
            }
        }
        return false;
    }

    public static Timetable switchTwoClassSubjectInstancesAndReturn(
        final Timetable timetable,
        final int index1,
        final int index2
    ) {
        final Timetable clonedTimetable = cloneCurrentTimeTable(timetable);
        final ClassSubjectInstance csi1 = clonedTimetable
            .getClassSubjectInstances()
            .get(index1);
        final ClassSubjectInstance csi2 = clonedTimetable
            .getClassSubjectInstances()
            .get(index2);

        if (
            csi1.getPeriod().isLunchBreak() || csi2.getPeriod().isLunchBreak()
        ) {
            return clonedTimetable;
        }

        final Period tempPeriod = csi2.getPeriod();

        csi2.setPeriod(csi1.getPeriod());
        csi1.setPeriod(tempPeriod);

        if (timetableHasOverlap(clonedTimetable)) {
            // reject the swap, but still hand back a throwaway copy - callers
            // repair whatever they get back and must not mutate the live one
            return cloneCurrentTimeTable(timetable);
        }

        return clonedTimetable;
    }
}
