package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
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

                if (!taughtByAnyOf(csi, teacherIds)) {
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

    /**
     * The hours the teachers of this one lesson never work, in the same shape
     * as collectTeacherOccupiedHours so the two can be merged into one set of
     * hours a move must stay away from.
     *
     * Both cost IMPOSSIBLE, so blocking only the clashes and leaving these to
     * the cost function meant the generator kept proposing destinations that
     * were just as illegal as where the lesson already sat.
     */
    public static Map<SchoolDays, Set<Integer>> collectNonWorkingHours(
        final ClassSubjectInstance csi
    ) {
        final Map<SchoolDays, Set<Integer>> nonWorking = new HashMap<>();

        if (csi == null || csi.getClassSubject() == null) {
            return nonWorking;
        }

        final List<Teacher> teachers = csi.getClassSubject().getTeachers();

        if (teachers == null) {
            return nonWorking;
        }

        for (final Teacher teacher : teachers) {
            if (teacher == null) {
                continue;
            }

            for (final TeacherNonWorkingHours hour : teacher.getTeacher_non_working_hours()) {
                if (hour.getDay() == null || hour.getSchoolHour() == null) {
                    continue;
                }

                nonWorking
                    .computeIfAbsent(hour.getDay(), day -> new HashSet<>())
                    .add(hour.getSchoolHour());
            }
        }

        return nonWorking;
    }

    /** Union of two hour maps, neither of them modified. */
    public static Map<SchoolDays, Set<Integer>> mergeBlockedHours(
        final Map<SchoolDays, Set<Integer>> first,
        final Map<SchoolDays, Set<Integer>> second
    ) {
        final Map<SchoolDays, Set<Integer>> merged = new HashMap<>();

        for (final Map<SchoolDays, Set<Integer>> source : List.of(
            first,
            second
        )) {
            for (final Map.Entry<SchoolDays, Set<Integer>> entry : source.entrySet()) {
                merged
                    .computeIfAbsent(entry.getKey(), day -> new HashSet<>())
                    .addAll(entry.getValue());
            }
        }

        return merged;
    }

    /**
     * Whether one of teacherIds teaches this lesson. Asked for every lesson
     * of the school on every move, so it walks the teacher list instead of
     * building a set of ids for each lesson the way teacherIdsOf does.
     */
    private static boolean taughtByAnyOf(
        final ClassSubjectInstance csi,
        final Set<Long> teacherIds
    ) {
        if (
            csi.getClassSubject() == null ||
            csi.getClassSubject().getTeachers() == null
        ) {
            return false;
        }

        for (final Teacher teacher : csi.getClassSubject().getTeachers()) {
            if (
                teacher != null &&
                teacher.getId() != null &&
                teacherIds.contains(teacher.getId())
            ) {
                return true;
            }
        }
        return false;
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

    /**
     * Every position a lesson could take in a day's order, not only the hours
     * that happen to be free.
     *
     * repairTimetable compacts each day so it runs from the first school hour
     * without gaps, which leaves returnAllFreePeriodsOnCertainDay with nothing
     * to offer but the hours past the end of the day - a lesson could only ever
     * be appended to a tail and the order inside a day could never change. That
     * froze whole days in place. These candidates are the start hours of the
     * lessons already on the day plus that tail, so a lesson can be pushed in
     * anywhere and the rest of the day slides one lesson to the right.
     */
    public static ArrayList<Period> returnAllInsertionPeriodsOnCertainDay(
        final Timetable timetable,
        final SchoolDays schoolDay,
        final int indexToMove,
        final Map<SchoolDays, Set<Integer>> blockedHours
    ) {
        final ArrayList<Period> result = new ArrayList<>();
        final ClassSubjectInstance instanceToMove = timetable
            .getClassSubjectInstances()
            .get(indexToMove);
        final int duration = instanceToMove.getDuration();
        final Set<Integer> blockedOnDay = blockedHours.getOrDefault(
            schoolDay,
            Collections.emptySet()
        );

        final List<ClassSubjectInstance> lessonsOnDay = timetable
            .getClassSubjectInstances()
            .stream()
            .filter(e -> e != instanceToMove)
            .filter(e -> e.getPeriod().getSchoolDays() == schoolDay)
            .filter(e -> !e.getPeriod().isLunchBreak())
            .sorted(
                Comparator.comparingInt(e -> e.getPeriod().getSchoolHour())
            )
            .toList();

        int occupiedHours = 0;
        for (final ClassSubjectInstance csi : lessonsOnDay) {
            occupiedHours += csi.getDuration();
        }

        if (
            FIRST_SCHOOL_HOUR + occupiedHours + duration - 1 > LAST_SCHOOL_HOUR
        ) {
            return result; // the day cannot hold this lesson on top
        }

        // one candidate in front of every lesson, plus one behind the last -
        // the hours themselves are what the day looks like once it is compact,
        // so they are read off the running total rather than off the periods,
        // which may still be stale when this is called
        int candidateHour = FIRST_SCHOOL_HOUR;

        for (int i = 0; i <= lessonsOnDay.size(); i++) {
            boolean isFree = true;

            for (int hour = 0; hour < duration; hour++) {
                if (blockedOnDay.contains(candidateHour + hour)) {
                    isFree = false; // a teacher of this lesson cannot be here
                    break;
                }
            }

            if (isFree) {
                result.add(new Period(schoolDay, candidateHour));
            }

            if (i < lessonsOnDay.size()) {
                candidateHour += lessonsOnDay.get(i).getDuration();
            }
        }

        return result;
    }

    /**
     * Whether moving everything from breakHour on one hour later would put a
     * lesson on an hour one of its teachers does not work.
     */
    private static boolean shiftHitsNonWorkingHour(
        final List<ClassSubjectInstance> lessonsOnDay,
        final int breakHour,
        final SchoolDays schoolday
    ) {
        for (final ClassSubjectInstance csi : lessonsOnDay) {
            if (csi.getPeriod().getSchoolHour() < breakHour) {
                continue; // stays where it is
            }

            if (csi.getClassSubject() == null) {
                continue;
            }

            final List<Teacher> teachers = csi.getClassSubject().getTeachers();

            if (teachers == null) {
                continue;
            }

            for (final Teacher teacher : teachers) {
                if (teacher == null) {
                    continue;
                }

                for (int i = 0; i < csi.getDuration(); i++) {
                    final TeacherNonWorkingHours hour =
                        new TeacherNonWorkingHours();
                    hour.setDay(schoolday);
                    hour.setSchoolHour(
                        csi.getPeriod().getSchoolHour() + i + 1
                    );

                    if (teacher.checkIfHourExistsInNonWorkingList(hour)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /**
     * Moves the lesson at index onto targetPeriod, pushing whatever already
     * starts at that hour or later one lesson to the right. The day the lesson
     * came from is left with a gap that repairTimetable closes.
     */
    public static Timetable insertClassSubjectInstanceAndReturn(
        final Timetable timetable,
        final int index,
        final Period targetPeriod
    ) {
        final Timetable clonedTimetable = cloneCurrentTimeTable(timetable);
        final ClassSubjectInstance movedInstance = clonedTimetable
            .getClassSubjectInstances()
            .get(index);
        final int duration = movedInstance.getDuration();

        for (final ClassSubjectInstance csi : clonedTimetable.getClassSubjectInstances()) {
            if (csi == movedInstance) {
                continue;
            }

            if (
                csi.getPeriod().getSchoolDays() !=
                targetPeriod.getSchoolDays() ||
                csi.getPeriod().getSchoolHour() < targetPeriod.getSchoolHour()
            ) {
                continue;
            }

            csi
                .getPeriod()
                .setSchoolHour(csi.getPeriod().getSchoolHour() + duration);
        }

        movedInstance.setPeriod(
            new Period(
                targetPeriod.getSchoolDays(),
                targetPeriod.getSchoolHour()
            )
        );

        return clonedTimetable;
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

    /**
     * How long a day has to be before it earns a lunch break at all, and how
     * much class has to sit in front of one.
     */
    public static final int LUNCH_BREAK_MIN_DAY_HOURS = 6;

    private static final int MIN_HOURS_BEFORE_LUNCH_BREAK = 2;

    /**
     * The hour a lunch break would ideally sit on for a day of lessonHours
     * class hours, the break itself counted: it splits the day as evenly as it
     * can. Placement below aims for this hour and the cost function prices the
     * distance from it, so a break that has to dodge a double period ends up
     * near the middle instead of exactly on it.
     */
    public static int idealLunchBreakHour(final int lessonHours) {
        return (lessonHours + 2) / 2;
    }

    /**
     * Places the one lunch break of a day as close to the middle as the
     * lessons allow.
     *
     * Expects the day to already be gap free and to start at the first school
     * hour - repairTimetable closes the gaps before calling this. A break may
     * only go on a boundary between two lessons, never inside a double or
     * triple period, so of those boundaries the one closest to
     * idealLunchBreakHour wins.
     */
    public static void implementLunchBreakOnDay(
        final Timetable timetable,
        final SchoolDays schoolday
    ) {
        if (hasLunchBreakOnDay(timetable, schoolday)) {
            return; // a day gets exactly one lunch break
        }

        final List<ClassSubjectInstance> lessonsOnDay = timetable
            .getClassSubjectInstances()
            .stream()
            .filter(e -> e.getPeriod().getSchoolDays() == schoolday)
            .filter(e -> !e.getPeriod().isLunchBreak())
            .sorted(
                Comparator.comparingInt(e -> e.getPeriod().getSchoolHour())
            )
            .toList();

        if (lessonsOnDay.size() < 2) {
            return; // nothing a break could split
        }

        final ClassSubjectInstance lastLesson = lessonsOnDay.getLast();
        final int firstHour = lessonsOnDay
            .getFirst()
            .getPeriod()
            .getSchoolHour();
        final int lastHour =
            lastLesson.getPeriod().getSchoolHour() +
            lastLesson.getDuration() -
            1;
        final int lessonHours = lastHour - firstHour + 1;

        if (lessonHours <= LUNCH_BREAK_MIN_DAY_HOURS) {
            return; // short enough to get through in one go
        }

        if (lastHour + 1 > LAST_SCHOOL_HOUR) {
            return; // the shift below would push the last lesson off the day
        }

        final int idealHour = idealLunchBreakHour(lessonHours);
        int bestHour = -1;
        boolean bestIsLegal = false;

        for (int i = 0; i < lessonsOnDay.size() - 1; i++) {
            // the hour right after lesson i, which is where lesson i + 1
            // starts - the only kind of hour a break can take over without
            // cutting a multi hour lesson in two
            final int boundary =
                lessonsOnDay.get(i).getPeriod().getSchoolHour() +
                lessonsOnDay.get(i).getDuration();

            if (boundary - firstHour < MIN_HOURS_BEFORE_LUNCH_BREAK) {
                continue; // too little class before the break
            }

            // inserting the break pushes the rest of the day an hour later,
            // which can land a lesson on an hour its teacher does not work.
            // Nothing else in the run can see that coming, and it costs far
            // more than an off centre break, so it wins the comparison.
            final boolean isLegal = !shiftHitsNonWorkingHour(
                lessonsOnDay,
                boundary,
                schoolday
            );

            if (bestHour < 0) {
                bestHour = boundary;
                bestIsLegal = isLegal;
                continue;
            }

            if (isLegal != bestIsLegal) {
                if (isLegal) {
                    bestHour = boundary;
                    bestIsLegal = true;
                }
                continue;
            }

            if (
                Math.abs(boundary - idealHour) <
                Math.abs(bestHour - idealHour)
            ) {
                bestHour = boundary;
            }
        }

        if (bestHour < 0) {
            return; // one long block, nowhere to cut it
        }

        final int breakHour = bestHour;

        // the break takes over its hour, so everything from there on moves one
        // hour later
        lessonsOnDay
            .stream()
            .filter(e -> e.getPeriod().getSchoolHour() >= breakHour)
            .forEach(e ->
                e.getPeriod().setSchoolHour(e.getPeriod().getSchoolHour() + 1)
            );

        timetable
            .getClassSubjectInstances()
            .add(
                new ClassSubjectInstance(
                    null,
                    new Period(schoolday, breakHour, true),
                    null,
                    1
                )
            ); // placeholder csi, it only marks the break
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
        return countOverlappingHours(timetable.getClassSubjectInstances());
    }

    /**
     * Summed over every hour, bookings - 1 is the same as all booked hours
     * minus the distinct ones, so a bit per hour is all this needs. It runs
     * for every teacher and every room on every cost evaluation, which is why
     * it no longer builds a map per day.
     */
    public static int countOverlappingHours(
        final List<ClassSubjectInstance> instances
    ) {
        final long[] bookedPerDay = new long[SchoolDays.values().length];
        Set<Long> bookedOutOfRange = null; // hours a long cannot hold
        int overlaps = 0;

        for (final ClassSubjectInstance csi : instances) {
            final SchoolDays day = csi.getPeriod().getSchoolDays();

            if (day == null) {
                continue;
            }

            for (int i = 0; i < csi.getDuration(); i++) {
                final int hour = csi.getPeriod().getSchoolHour() + i;

                if (hour >= 0 && hour <= 63) {
                    final long bit = 1L << hour;

                    if ((bookedPerDay[day.ordinal()] & bit) != 0) {
                        overlaps++; // one booking per hour is fine
                    } else {
                        bookedPerDay[day.ordinal()] |= bit;
                    }
                    continue;
                }

                if (bookedOutOfRange == null) {
                    bookedOutOfRange = new HashSet<>();
                }
                if (!bookedOutOfRange.add((long) day.ordinal() << 32 | (hour & 0xffffffffL))) {
                    overlaps++;
                }
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
