package at.htlleonding.leoplaner.data;

import java.util.List;
import java.util.Map;
import java.util.Random;

import jakarta.inject.Inject;

import java.util.ArrayList;

public class TimetableManager {
    public static ArrayList<Period> returnAllFreePeriodsOnCertainDay(final Timetable timetable,
            final SchoolDays schoolDay,
            final int duration) {
        final ArrayList<Period> result = new ArrayList<>();
        final List<ClassSubjectInstance> csisOnDay = timetable.getClassSubjectInstances().stream()
                .filter(e -> e.getPeriod().getSchoolDays() == schoolDay).toList();

        final int FIRST_HOUR = 1;
        final int LAST_HOUR = 10;

        // latest possible start hour so duration fits
        for (int startHour = FIRST_HOUR; startHour <= LAST_HOUR - duration + 1; startHour++) {
            boolean isFree = true;

            // check agaainst ALL existing CSIs
            for (final ClassSubjectInstance csi : csisOnDay) {
                final int occupiedStart = csi.getPeriod().getSchoolHour();
                final int occupiedEnd = occupiedStart + csi.getDuration() - 1;

                final int candidateStart = startHour;
                final int candidateEnd = startHour + duration - 1;

                // overlap check
                if (candidateStart <= occupiedEnd && candidateEnd >= occupiedStart) {
                    isFree = false;
                    break;
                }
            }

            if (isFree) {
                result.add(new Period(schoolDay, startHour));
            }
        }

        return result;
    }

    public static Timetable giveClassSubjectRandomPeriodAndReturn(final Timetable timetable, final int index) {
        final Random random = new Random();
        final ArrayList<Period> allFreePeriods = new ArrayList<>();

        for (final SchoolDays schoolDay : SchoolDays.values()) {
            allFreePeriods.addAll(
                    returnAllFreePeriodsOnCertainDay(timetable, schoolDay,
                            timetable.getClassSubjectInstances().get(index).getDuration()));
        }

        if (allFreePeriods.isEmpty()) {
            throw new RuntimeException("no Free Period avaible"); // TODO add a check for that in algorrithm class
        }

        return switchClassSubjectInstancePeriodAndReturn(timetable, index,
                allFreePeriods.get(random.nextInt(allFreePeriods.size())));
    }

    public static Timetable switchClassSubjectInstancePeriodAndReturn(final Timetable timetable, final int index,
            final Period newPeriod) {
        final Timetable clonedTimetable = cloneCurrentTimeTable(timetable);
        final ClassSubjectInstance csi = clonedTimetable.getClassSubjectInstances().get(index);
        csi.setPeriod(newPeriod);
        return clonedTimetable;
    }

    public static void implementRandomLunchBreakOnDay(final Timetable timetable, final SchoolDays schoolday) {
        final int HIGHEST_SCHOOLHOUR = timetable.getClassSubjectInstances().stream()
                .filter(e -> e.getPeriod().getSchoolDays() == schoolday).mapToInt(e -> e.getPeriod().getSchoolHour())
                .max().getAsInt(); // get highest Schoolhour
        final int LOWEST_SCHOOLHOUR = timetable.getClassSubjectInstances().stream()
                .filter(e -> e.getPeriod().getSchoolDays() == schoolday).mapToInt(e -> e.getPeriod().getSchoolHour())
                .min().getAsInt(); // get lowest Schoolhour

        Random random = new Random();

        int randBob = random.nextInt(LOWEST_SCHOOLHOUR + 2, HIGHEST_SCHOOLHOUR + 1);

        boolean LUNCHBREAK = true;

        timetable.getClassSubjectInstances().stream().filter(
                e -> e.getPeriod().getSchoolDays() == schoolday && e.getPeriod().getSchoolHour() >= randBob)
                .forEach(e -> e.getPeriod().setSchoolHour(e.getPeriod().getSchoolHour() + 1)); // move each class after
                                                                                               // lunch break one hour
                                                                                               // later

        Period lunchBreakPeriod = new Period(schoolday, randBob + 1, LUNCHBREAK);
        if (!checkIfPeriodIsFreeOnDay(timetable, randBob, 1, schoolday)) {
            lunchBreakPeriod.setSchoolHour(lunchBreakPeriod.getSchoolHour() + 1);
        }

        timetable.getClassSubjectInstances().add(
                new ClassSubjectInstance(null, lunchBreakPeriod, null, 1)); // place
                                                                            // holder
                                                                            // fake
        // csi for lunch
        // break
    }

    public static boolean checkIfPeriodIsFreeOnDay(final Timetable timetable, final int schoolHour,
            final int duration, final SchoolDays schoolDay) {

        List<Integer> allOccupiedHoursOnDay = new ArrayList<>();

        for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            for (int i = 0; i < csi.getDuration(); i++) {
                allOccupiedHoursOnDay.add(csi.getPeriod().getSchoolHour());
            }
        }

        if (allOccupiedHoursOnDay.isEmpty()) { // entire day is free
            return true;
        }

        for (int i = 0; i < duration; i++) {
            if (allOccupiedHoursOnDay.contains(schoolHour + i)) {
                return false;
            }
        }
        return true;
    }

    public static ArrayList<ClassSubjectInstance> cloneClassSubjectInstanceList(final Timetable timetable) { // deep
                                                                                                             // deep
                                                                                                             // copy
        // since
        // all lives on the
        // heap
        final ArrayList<ClassSubjectInstance> clonedClassSubjectInstances = new ArrayList<>();
        for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            final Period clonedPeriod = new Period(csi.getPeriod().getSchoolDays(), csi.getPeriod().getSchoolHour());
            final ClassSubjectInstance clonedCsi = new ClassSubjectInstance(csi.getClassSubject(), clonedPeriod,
                    csi.getRoom(), csi.getDuration());
            clonedClassSubjectInstances.add(clonedCsi);
        }
        return clonedClassSubjectInstances;
    }

    public static void calculateWeeklyHours(final Timetable timetable) { // TODO free lunch periods not included yet
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

    public static Timetable switchTwoClassSubjectInstancesAndReturn(final Timetable timetable, final int index1,
            final int index2) {
        final Timetable clonedTimetable = cloneCurrentTimeTable(timetable);
        final ClassSubjectInstance csi1 = clonedTimetable.getClassSubjectInstances().get(index1);
        final ClassSubjectInstance csi2 = clonedTimetable.getClassSubjectInstances().get(index2);

        final Period tempPeriod = csi2.getPeriod();
        csi2.setPeriod(csi1.getPeriod());
        csi1.setPeriod(tempPeriod);

        return clonedTimetable;
    }
}
