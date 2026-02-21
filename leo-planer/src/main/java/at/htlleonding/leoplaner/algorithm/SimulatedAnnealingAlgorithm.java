package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonPreferredHours;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
import at.htlleonding.leoplaner.data.TeacherTakenPeriod;
import at.htlleonding.leoplaner.data.Timetable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@ApplicationScoped
public class SimulatedAnnealingAlgorithm {
    @Inject
    DataRepository dataRepository;

    private static final Map<CostDegree, Integer> costOfEachDegree = new HashMap<>();
    static {
        costOfEachDegree.put(CostDegree.LOW, 5);
        costOfEachDegree.put(CostDegree.MID, 20);
        costOfEachDegree.put(CostDegree.HIGH, 50);
        costOfEachDegree.put(CostDegree.SEVERE, 100);
        costOfEachDegree.put(CostDegree.IMPOSSIBLE, 99999);
    }

    private static final Map<SchoolDays, Integer> costOfEachDay = new HashMap<>();
    static {
        costOfEachDay.put(SchoolDays.MONDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.TUESDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.WEDNESDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.THURSDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.FRIDAY, costOfEachDegree.get(CostDegree.HIGH));
        costOfEachDay.put(SchoolDays.SATURDAY, costOfEachDegree.get(CostDegree.IMPOSSIBLE)); // is to never be accepted
    }

    private final int ITERATIONS = 10000;
    private final double COOLING_RATE = 0.995;
    public static final double BOLTZMANN_CONSTANT = 1; // maybe adjust real constant: 1.380649e-23;
    // public static final double BOLTZMANN_CONSTANT = 1.380649e-23;

    public void initAlgorithmForAllClasses() {
        for (String className : this.dataRepository.getCurrentTimetableList().keySet()) {
            algorithmLoop(this.dataRepository.getCurrentTimetableList().get(className), className);
        }
    }

    public void algorithmLoop(Timetable currTimetable, String className) {
        double temperature = 1000.0; // could also go in the small number range like 1-0
        Timetable nextTimeTable = new Timetable();

        final Random random = new Random();
        for (int i = 0; i < ITERATIONS; i++) { // main loop
            final int indexesAmount = currTimetable.getClassSubjectInstances().size();
            final int ranIndex1 = random.nextInt(0, indexesAmount);
            int ranIndex2;

            do {
                ranIndex2 = random.nextInt(0, indexesAmount);
            } while (ranIndex2 == ranIndex1);
            // create 2 random non equal indexes

            if (currTimetable.getClassSubjectInstances().get(ranIndex1).getPeriod().isLunchBreak()
                    || currTimetable.getClassSubjectInstances().get(ranIndex2).getPeriod().isLunchBreak()) {
                continue; // no reason to play around with lunch breaks only causes problems
            } // if more checks are needed then itll be moved to a helper method

            nextTimeTable = chooseRandomNeighborFunction(ranIndex1, ranIndex2, currTimetable, nextTimeTable);

            final int costCurrTimeTable = determineCost(currTimetable);
            final int costNextTimeTable = determineCost(nextTimeTable);

            final boolean acceptSolution = acceptSolution(costCurrTimeTable, costNextTimeTable, temperature);
            if (acceptSolution) {
                currTimetable = nextTimeTable;
            }

            setAttributesOfTimetable(currTimetable, costCurrTimeTable, temperature);

            decreaseTemperature(temperature);
            this.dataRepository.getCurrentTimetableList().put(className, currTimetable);
        }

        repairTimetable(currTimetable);
        this.dataRepository.getCurrentTimetableList().put(className, currTimetable);
    }

    public void setAttributesOfTimetable(Timetable timetableToSet, int cost, double temperature) { // maybe make Generic
        // for dynamic
        timetableToSet.setCostOfTimetable(cost);
        timetableToSet.setTempAtTimetable(temperature);
    }

    // TODO maybe advance with just being able to get new Changes instead of entire
    // timetable
    public void setTeacherTakenPeriod(final Timetable timetable) {
        final List<ClassSubjectInstance> classSubjectInstancesList = timetable.getClassSubjectInstances();

        for (ClassSubjectInstance csi : classSubjectInstancesList) {
            final Period period = csi.getPeriod();
            final ClassSubject classSubject = csi.getClassSubject();
            final String className = classSubject.getSchoolClass().getClassName();
            final Teacher teacher = classSubject.getTeacher();

            teacher.getTakenUpPeriods().add(new TeacherTakenPeriod(period, className));
        }
    }

    public void resetAllTeacherTakenPeriodInClass(final String className) {
        List<Teacher> teachers = this.dataRepository.getAllTeachers();

        teachers.stream().forEach(
                teacher -> resetTeacherTakenPeriod(teacher, className));
    }

    public void resetTeacherTakenPeriod(final Teacher teacher, String className) {
        teacher.getTakenUpPeriods().removeAll(
                teacher.getTakenUpPeriods().stream().filter(e -> e.className().equals(className)).toList());
    }

    public void repairTimetable(Timetable timetable) {
        for (SchoolDays day : SchoolDays.values()) {
            List<ClassSubjectInstance> classesOnDay = timetable.getClassSubjectInstances().stream()
                    .filter(e -> e.getPeriod().getSchoolDays() == day)
                    .sorted(Comparator.comparingInt(e -> e.getPeriod().getSchoolHour())).toList();

            moveDayToStartAtFirstHour(timetable, classesOnDay);
            closeAllGapsBetweenInstances(timetable, classesOnDay);
            searchAndImplementLunchBreaks(timetable, classesOnDay, day);
        }
    }

    public void moveDayToStartAtFirstHour(Timetable timetable, List<ClassSubjectInstance> classesOnDay) {
        if (classesOnDay.isEmpty()) {
            return;
        }

        Period firstClassOfTheDay = classesOnDay.getFirst().getPeriod();

        if (firstClassOfTheDay.getSchoolHour() != 1) {
            firstClassOfTheDay.setSchoolHour(1);
        }
    }

    public void closeAllGapsBetweenInstances(Timetable timetable, List<ClassSubjectInstance> classesOnDay) {
        for (int i = 0; i < classesOnDay.size() - 1; i++) {
            int currentEndOfClass = classesOnDay.get(i).getPeriod().getSchoolHour() + classesOnDay.get(i).getDuration();
            Period nextPeriod = classesOnDay.get(i + 1).getPeriod();

            if (nextPeriod.getSchoolHour() > currentEndOfClass) { // just means if the next class starts at a time
                // bigger than what the previous class ended, hence
                // resulting in a gap
                nextPeriod.setSchoolHour(currentEndOfClass);
            }
        }
    }

    public void searchAndImplementLunchBreaks(Timetable timetable, List<ClassSubjectInstance> classesOnDay,
            SchoolDays day) {
        if (classesOnDay.stream().anyMatch(e -> e.getPeriod().getSchoolHour() + e.getDuration() - 1 > 6)) {
            timetable.implementRandomLunchBreakOnDay(day);
        }
    }

    public int determineCost(final Timetable timetable) {
        // TODO if classsubject instance on friday, high cost
        // the later the period the more cost
        // if against classSubject.isBetterDoublePeriod higher cost
        // maybe different rooms
        int cost = 0;
        for (ClassSubjectInstance classSubjectInstance : new ArrayList<>(timetable.getClassSubjectInstances())) {
            final Teacher teacher = classSubjectInstance.getClassSubject().getTeacher();
            final Period period = classSubjectInstance.getPeriod();

            if (checkIfTeacherPeriodIsTakenInOtherClass(teacher, period)) {
                return cost + costOfEachDegree.get(CostDegree.IMPOSSIBLE);
            }

            final TeacherNonWorkingHours teacherNonWorkingHour = new TeacherNonWorkingHours();
            teacherNonWorkingHour.setDay(period.getSchoolDays());
            teacherNonWorkingHour.setSchoolHour(period.getSchoolHour());
            if (classSubjectInstance.getClassSubject() != null && classSubjectInstance.getClassSubject().getTeacher()
                    .checkIfHourExistsInNonWorkingList(teacherNonWorkingHour)) {
                return cost + costOfEachDegree.get(CostDegree.IMPOSSIBLE); // is to be never be accepted
            }

            final TeacherNonPreferredHours teacherNonPreferredHours = new TeacherNonPreferredHours();
            teacherNonPreferredHours.setDay(period.getSchoolDays());
            teacherNonPreferredHours.setSchoolHour(period.getSchoolHour());
            if (classSubjectInstance.getClassSubject() != null && classSubjectInstance.getClassSubject().getTeacher()
                    .checkIfHourExistsInNonPreferredList(teacherNonPreferredHours)) {
                cost += costOfEachDegree.get(CostDegree.SEVERE);
            }

            cost += costOfEachDay.get(period.getSchoolDays()); // cost of being in each day, replacing the switch case

            if (period.getSchoolHour() + classSubjectInstance.getDuration() - 1 > 6) {
                cost += (period.getSchoolHour() + classSubjectInstance.getDuration() - 1 - 5)
                        * costOfEachDegree.get(CostDegree.LOW);
            }

            if (classSubjectInstance.getClassSubject() != null
                    && classSubjectInstance.getClassSubject().isBetterDoublePeriod()
                    && classSubjectInstance.getDuration() == 1) {
                cost += costOfEachDegree.get(CostDegree.MID); // TODO handle required double period check when creating
                                                              // random timetable
            }
        }
        return cost;
    }

    public boolean checkIfTeacherPeriodIsTakenInOtherClass(final Teacher teacher, final Period period) {
        return teacher.getTakenUpPeriods().stream().anyMatch(e -> e.period() == period);
    }

    public Timetable chooseRandomNeighborFunction(final int index1, final int index2, Timetable currTimetable,
            Timetable nextTimetable) {
        final Random random = new Random();
        final int ranNumber = random.nextInt(1, 2);

        switch (ranNumber) {
            case 1:
                return changePeriod(index1, currTimetable);
            // swapPeriods(index1, index2);
            case 2:
                return changePeriod(index1, currTimetable);
        }
        return null;
    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable, final double temperature) {
        final int deltaCost = costNextTimeTable - costCurrTimeTable;

        if (deltaCost < 0) { // next solution is better, always accept
            return true;
        }

        final double probability = Math.exp(-deltaCost / (BOLTZMANN_CONSTANT * temperature));

        return Math.random() < probability;
    }

    public void pushTemperature(final double pushAmount) {

    }

    public Timetable swapPeriods(final int firstIndex, final int secondIndex, Timetable currTimetable) {
        return currTimetable.switchTwoClassSubjectInstancesAndReturn(firstIndex, secondIndex);
    }

    public Timetable changePeriod(final int index, final Timetable currTimeTable) {
        return currTimeTable.giveClassSubjectRandomPeriodAndReturn(index);
    }

    public boolean changeRoom(final ClassSubjectInstance classSubject) {
        return true;
    }

    public boolean changeTeacher(final ClassSubjectInstance classSubject) {
        return true;
    }

    public void decreaseTemperature(double temperature) {
        temperature *= COOLING_RATE;
    }
}
