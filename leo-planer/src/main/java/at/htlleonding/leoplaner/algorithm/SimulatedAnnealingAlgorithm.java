package at.htlleonding.leoplaner.algorithm;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonPreferredHours;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
import at.htlleonding.leoplaner.data.TeacherTakenPeriod;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.data.TimetableManager;
import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class SimulatedAnnealingAlgorithm {
    @Inject
    DataRepository dataRepository;

    @Inject
    jakarta.enterprise.event.Event<AlgorithmProgressDTO> progressEvent;

    private static final Map<CostDegree, Integer> costOfEachDegree = new HashMap<>();
    static {
        costOfEachDegree.put(CostDegree.LOW, 5);
        costOfEachDegree.put(CostDegree.MID, 20);
        costOfEachDegree.put(CostDegree.HIGH, 50);
        costOfEachDegree.put(CostDegree.SEVERE, 100);
        costOfEachDegree.put(CostDegree.IMPOSSIBLE, 9999999);
    }

    private static final Integer IMPOSSIBLE_COST = costOfEachDegree.get(CostDegree.IMPOSSIBLE); // is to be never be
                                                                                                // accepted
    private static final Integer SEVERE_COST = costOfEachDegree.get(CostDegree.SEVERE);
    private static final Integer HIGH_COST = costOfEachDegree.get(CostDegree.HIGH);
    private static final Integer MID_COST = costOfEachDegree.get(CostDegree.MID);
    private static final Integer LOW_COST = costOfEachDegree.get(CostDegree.LOW);

    private static final Map<SchoolDays, Integer> costOfEachDay = new HashMap<>();
    static {
        costOfEachDay.put(SchoolDays.MONDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.TUESDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.WEDNESDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.THURSDAY, costOfEachDegree.get(CostDegree.LOW));
        costOfEachDay.put(SchoolDays.FRIDAY, costOfEachDegree.get(CostDegree.MID));
        costOfEachDay.put(SchoolDays.SATURDAY, costOfEachDegree.get(CostDegree.IMPOSSIBLE)); // is to never be accepted
    }

    private final AtomicLong temperature = new AtomicLong(Double.doubleToLongBits(1000.0));
    private final int ITERATIONS = 50000;
    private final double COOLING_RATE = 0.999;
    public static final double BOLTZMANN_CONSTANT = 10; // maybe adjust real constant: 1.380649e-23;
    // public static final double BOLTZMANN_CONSTANT = 1.380649e-23;

    public record History(int iteration, double temperature, int cost) {
    }

    public void algorithmLoop() {
        final Map<String, Timetable> schoolScheduleMap = dataRepository.getCurrentTimetableList();
        List<Timetable> schoolSchedule = new ArrayList<>(schoolScheduleMap.values());

        Timetable currTimetable;
        Timetable nextTimeTable;

        final Random random = new Random();
        for (int i = 0; i < ITERATIONS; i++) { // main loop
            final int randomClassIndex = random.nextInt(schoolSchedule.size());
            currTimetable = schoolSchedule.get(randomClassIndex);
            final String className = currTimetable.getClassSubjectInstances().getFirst().getClassSubject()
                    .getSchoolClass().getClassName();

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

            nextTimeTable = chooseRandomNeighborFunction(ranIndex1, ranIndex2, currTimetable);
            repairTimetable(nextTimeTable);

            int costCurrSchoolSchedule = determineCost(schoolSchedule);

            final List<Timetable> nextSchoolSchedule = new ArrayList<>(schoolSchedule);
            nextSchoolSchedule.set(randomClassIndex, nextTimeTable);
            final int costNextSchoolSchedule = determineCost(nextSchoolSchedule);

            final boolean acceptSolution = acceptSolution(costCurrSchoolSchedule, costNextSchoolSchedule);
            if (acceptSolution) {
                schoolSchedule = nextSchoolSchedule;
                costCurrSchoolSchedule = costNextSchoolSchedule;
            }

            setAttributesOfTimetable(currTimetable, costCurrSchoolSchedule, getTemperature());

            if (i % 50 == 0) {
                try {
                    // Thread.sleep(300);
                } catch (Exception e) {
                    // TODO: handle exception
                }
                this.dataRepository.getHistoryList().add(new History(i, getTemperature(), costCurrSchoolSchedule));
                progressEvent.fire(new AlgorithmProgressDTO(i, getTemperature(), costCurrSchoolSchedule, false));
            }
            decreaseTemperature();
            this.dataRepository.getCurrentTimetableList().put(className, currTimetable);
            progressEvent.fire(new AlgorithmProgressDTO(ITERATIONS, getTemperature(), costCurrSchoolSchedule, true));
        }
    }

    public void setAttributesOfTimetable(final Timetable timetable, final int cost, final double temperature) { // maybe
                                                                                                                // make
                                                                                                                // Generic
        // for dynamic
        timetable.setCostOfTimetable(cost);
        timetable.setTempAtTimetable(temperature);
    }

    // TODO maybe advance with just being able to get new Changes instead of entire
    // timetable
    public void setTeacherTakenPeriod(final Teacher teacher, final Timetable timetable) {
        final List<ClassSubjectInstance> classSubjectInstancesList = timetable.getClassSubjectInstances().stream()
                .filter(e -> e.getClassSubject() != null)
                .filter(e -> e.getClassSubject().getTeacher().getId().equals(teacher.getId())).toList();

        for (final ClassSubjectInstance csi : classSubjectInstancesList) {
            final Period period = csi.getPeriod();
            teacher.getTakenUpPeriods().add(new TeacherTakenPeriod(period, timetable.getSchoolClass().getClassName()));
        }
    }

    public void resetAllTeacherTakenPeriodForClass(final List<Teacher> teachers, String className) {
        for (Teacher teacher : teachers) {
            List<TeacherTakenPeriod> takenPeriodsList = teacher.getTakenUpPeriods();
            takenPeriodsList.removeIf(e -> e.className().equals(className));
        }
    }

    public void resetTeacherTakenPeriod(final Teacher teacher) {
        teacher.setTakenUpPeriods(new ArrayList<>());
    }

    public void repairTimetable(final Timetable timetable) {
        timetable.getClassSubjectInstances()
                .removeIf(csi -> csi.getClassSubject() == null && !csi.getPeriod().isLunchBreak());
        for (final SchoolDays day : SchoolDays.values()) {
            final List<ClassSubjectInstance> classesOnDay = timetable.getClassSubjectInstances().stream()
                    .filter(e -> e.getPeriod().getSchoolDays() == day)
                    .sorted(Comparator.comparingInt(e -> e.getPeriod().getSchoolHour())).toList();

            moveDayToStartAtFirstHour(timetable, classesOnDay);
            closeAllGapsBetweenInstances(timetable, classesOnDay);
            searchAndImplementLunchBreaks(timetable, classesOnDay, day);
        }
    }

    public void moveDayToStartAtFirstHour(final Timetable timetable, final List<ClassSubjectInstance> classesOnDay) {
        if (classesOnDay.isEmpty()) {
            return;
        }

        final Period firstClassOfTheDay = classesOnDay.getFirst().getPeriod();

        if (firstClassOfTheDay.getSchoolHour() != 1) {
            firstClassOfTheDay.setSchoolHour(1);
        }
    }

    public void closeAllGapsBetweenInstances(final Timetable timetable, final List<ClassSubjectInstance> classesOnDay) {
        for (int i = 0; i < classesOnDay.size() - 1; i++) {
            final int currentEndOfClass = classesOnDay.get(i).getPeriod().getSchoolHour()
                    + classesOnDay.get(i).getDuration();
            final Period nextPeriod = classesOnDay.get(i + 1).getPeriod();

            if (nextPeriod.getSchoolHour() > currentEndOfClass) { // just means if the next class starts at a time
                // bigger than what the previous class ended, hence
                // resulting in a gap
                nextPeriod.setSchoolHour(currentEndOfClass);
            }
        }
    }

    public void searchAndImplementLunchBreaks(final Timetable timetable, final List<ClassSubjectInstance> classesOnDay,
            final SchoolDays day) {
        if (classesOnDay.stream().anyMatch(e -> e.getPeriod().getSchoolHour() + e.getDuration() - 1 > 6)) {
            TimetableManager.implementRandomLunchBreakOnDay(timetable, day);
        }
    }

    public List<Teacher> getAllTeachersInSchoolSchedule(final List<Timetable> schoolSchedule) {
        return schoolSchedule.stream()
                .flatMap(timetable -> timetable.getClassSubjectInstances().stream())
                .map(csi -> csi.getClassSubject())
                .filter(cs -> cs != null)
                .map(cs -> cs.getTeacher())
                .filter(teacher -> teacher != null)
                .distinct()
                .toList();

    }

    public int determineTeacherWorkloadCost(final Teacher teacher) {
        int cost = 0;
        final Map<SchoolDays, Integer> hoursPerDay = new HashMap<>();

        final List<Period> takenUpPeriods = teacher.getTakenUpPeriods().stream().map(e -> e.period()).toList();

        for (final Period period : takenUpPeriods) {
            if (period.isLunchBreak())
                continue;

            hoursPerDay.merge(period.getSchoolDays(), 1, Integer::sum);
        }

        for (final int hours : hoursPerDay.values()) {
            if (hours > 0 && hours < 2) {
                cost += SEVERE_COST;
            } else if (hours > 0 && hours < 3) {
                cost += HIGH_COST;
            } else if (hours > 0 && hours < 4) {
                cost += MID_COST;
            }
        }
        return cost;
    }

    public int determineCost(final List<Timetable> schoolSchedule) {
        // TODO if classsubject instance on friday, high cost
        // the later the period the more cost
        // if against classSubject.isBetterDoublePeriod higher cost
        // maybe different rooms
        int cost = 0;
        final List<Teacher> allTeachers = getAllTeachersInSchoolSchedule(schoolSchedule);

        for (final Timetable timetable : schoolSchedule) {

            for (final Teacher teacher : allTeachers) {
                if (timetable.getSchoolClass() == null) {
                    continue;
                }
                resetAllTeacherTakenPeriodForClass(allTeachers, timetable.getSchoolClass().getClassName());
                setTeacherTakenPeriod(teacher, timetable);
                cost += determineTeacherWorkloadCost(teacher);
            }

            final Map<SchoolDays, Integer> countOfClassesPerDay = new HashMap<>();

            for (final ClassSubjectInstance classSubjectInstance : new ArrayList<>(
                    timetable.getClassSubjectInstances())) {
                final Period period = classSubjectInstance.getPeriod();

                if (period.isLunchBreak() || classSubjectInstance.getClassSubject() == null) {
                    continue; // lunch break will cause breaks
                }

                final Teacher teacher = classSubjectInstance.getClassSubject().getTeacher();
                String className = "";
                if (timetable.getSchoolClass() != null) {
                    className = timetable.getSchoolClass().getClassName();
                    if (checkIfTeacherPeriodIsTakenInOtherClass(teacher, period, className)) {
                        // return cost + IMPOSSIBLE_COST;
                    }
                }

                // cost stuff
                cost += determineCostForTeacherHours(teacher, period); // teacher non
                // preffered / non working hours

                cost += costOfEachDay.get(period.getSchoolDays()); // cost of being in each day, replacing the switch
                                                                   // case

                if (period.getSchoolHour() + classSubjectInstance.getDuration() - 1 > 6) {
                    cost += (period.getSchoolHour() + classSubjectInstance.getDuration() - 1 - 5)
                            * MID_COST;
                }

                if (classSubjectInstance.getClassSubject() != null
                        && classSubjectInstance.getClassSubject().isBetterDoublePeriod()
                        && classSubjectInstance.getDuration() == 1) {
                    cost += MID_COST; // TODO handle required double period check when creating
                                      // random timetable
                }

                if (countOfClassesPerDay.containsKey(period.getSchoolDays())) {
                    Integer currCount = countOfClassesPerDay.get(period.getSchoolDays());
                    countOfClassesPerDay.put(period.getSchoolDays(), currCount++);
                } else {
                    countOfClassesPerDay.put(period.getSchoolDays(), 0);
                }
            }
            cost += determineCostForSpreadOutClasses(countOfClassesPerDay);
        }

        return cost;
    }

    public int determineCostForTeacherHours(final Teacher teacher, final Period period) {
        final TeacherNonWorkingHours teacherNonWorkingHour = new TeacherNonWorkingHours();
        teacherNonWorkingHour.setDay(period.getSchoolDays());
        teacherNonWorkingHour.setSchoolHour(period.getSchoolHour());
        if (teacher.checkIfHourExistsInNonWorkingList(teacherNonWorkingHour)) {
            return IMPOSSIBLE_COST; // is to be never be accepted
        }

        final TeacherNonPreferredHours teacherNonPreferredHours = new TeacherNonPreferredHours();
        teacherNonPreferredHours.setDay(period.getSchoolDays());
        teacherNonPreferredHours.setSchoolHour(period.getSchoolHour());
        if (teacher.checkIfHourExistsInNonPreferredList(teacherNonPreferredHours)) {
            return SEVERE_COST;
        }

        return 0;
    }

    public int determineCostForSpreadOutClasses(final Map<SchoolDays, Integer> countOfClassesPerDay) {
        int determinedCost = 0;

        for (final int countOfClasses : countOfClassesPerDay.values()) {
            if (countOfClasses < 3) {
                determinedCost += SEVERE_COST;
            }
        }

        return determinedCost;
    }

    public boolean checkIfTeacherPeriodIsTakenInOtherClass(final Teacher teacher, final Period period,
            final String currentClassName) {
        return teacher.getTakenUpPeriods().stream()
                .anyMatch(e -> e.period().getSchoolDays() == period.getSchoolDays() &&
                        e.period().getSchoolHour() == period.getSchoolHour() &&
                        !e.className().equals(currentClassName));
    }

    public Timetable chooseRandomNeighborFunction(final int index1, final int index2, final Timetable currTimetable) {
        final Random random = new Random();
        final int ranNumber = random.nextInt(1, 2);

        switch (ranNumber) {
            case 1:
                return changePeriod(currTimetable, index1, currTimetable);
            // swapPeriods(index1, index2);
            case 2:
                return changePeriod(currTimetable, index1, currTimetable);
        }
        return null;
    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable) {
        final int deltaCost = costNextTimeTable - costCurrTimeTable;
        if (deltaCost >= IMPOSSIBLE_COST)
            return false;

        if (deltaCost < 0) { // next solution is better, always accept
            return true;
        }

        final double probability = Math.exp(-deltaCost / (BOLTZMANN_CONSTANT * getTemperature()));

        return Math.random() < probability;
    }

    public void pushTemperature(final double pushAmount) {
        double current = getTemperature();
        setTemperature(current + pushAmount);
    }

    public Timetable swapPeriods(final Timetable timetable, final int firstIndex, final int secondIndex,
            final Timetable currTimetable) {
        return TimetableManager.switchTwoClassSubjectInstancesAndReturn(timetable, firstIndex, secondIndex);
    }

    public Timetable changePeriod(final Timetable timetable, final int index, final Timetable currTimeTable) {
        return TimetableManager.giveClassSubjectRandomPeriodAndReturn(timetable, index);
    }

    public boolean changeRoom(final ClassSubjectInstance classSubject) {
        return true;
    }

    public boolean changeTeacher(final ClassSubjectInstance classSubject) {
        return true;
    }

    public double getTemperature() {
        return Double.longBitsToDouble(temperature.get());
    }

    public void setTemperature(double newValue) {
        temperature.set(Double.doubleToLongBits(newValue));
    }

    public void decreaseTemperature() {
        double current = getTemperature();
        setTemperature(current * COOLING_RATE);
    }
}
