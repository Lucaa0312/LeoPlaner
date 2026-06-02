package at.htlleonding.leoplaner.algorithm;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonPreferredHours;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
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
        costOfEachDegree.put(CostDegree.LOW, 3);
        costOfEachDegree.put(CostDegree.MID, 10);
        costOfEachDegree.put(CostDegree.HIGH, 20);
        costOfEachDegree.put(CostDegree.SEVERE, 50);
        costOfEachDegree.put(CostDegree.IMPOSSIBLE, 1000);
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

    private final AtomicBoolean isRunning = new AtomicBoolean(true);
    private final AtomicBoolean automaticMode = new AtomicBoolean(false);

    private final CoolingMode initCoolingMode = CoolingMode.GEOMETRIC;
    private AtomicReference<CoolingMode> coolingMode = new AtomicReference<>(initCoolingMode);

    private static final double INITIAL_TEMPERATURE = 500;
    private static AtomicLong temperature = new AtomicLong(Double.doubleToLongBits(INITIAL_TEMPERATURE));
    // private final int ITERATIONS = 10000;
    private final double COOLING_RATE = 0.9994;
    public static final double BOLTZMANN_CONSTANT = 1; // maybe adjust real constant: 1.380649e-23;
    // public static final double BOLTZMANN_CONSTANT = 1.380649e-23;

    public record History(long iteration, double temperature, long cost) {
    }

    public void algorithmLoop() {
        algorithmLoop(Long.MAX_VALUE);
    }

    public void algorithmLoop(final Long iterationCap) {
        this.dataRepository.setAlgorithmRunning(true);
        this.dataRepository.setAlgorithmRunningAtLeastOnce(true);
        setTemperature(INITIAL_TEMPERATURE);
        long iterationCounter = 0;
        long costFinal = 0;
        long bestCosts = Long.MAX_VALUE;
        long lastBestCost = bestCosts;
        int hitBestCostCounter = 0;

        final Map<String, Timetable> schoolScheduleMap = dataRepository.getAllTimetables();
        List<Timetable> schoolSchedule = new ArrayList<>(schoolScheduleMap.values());

        Timetable currTimetable;
        Timetable nextTimeTable;

        final Random random = new Random();
        System.out.println(getIsRunning());
        while (getIsRunning() && iterationCounter < iterationCap) { // main loop
            this.coolingMode.set(this.dataRepository.getCoolingMode());
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
            // repairTimetable(nextTimeTable);

            int costCurrSchoolSchedule = determineCost(schoolSchedule);

            final List<Timetable> nextSchoolSchedule = new ArrayList<>(schoolSchedule);
            nextSchoolSchedule.set(randomClassIndex, nextTimeTable);
            final int costNextSchoolSchedule = determineCost(nextSchoolSchedule);

            final boolean acceptSolution = acceptSolution(costCurrSchoolSchedule, costNextSchoolSchedule);
            if (acceptSolution) {
                schoolSchedule = nextSchoolSchedule;
                costCurrSchoolSchedule = costNextSchoolSchedule;
                costFinal = costCurrSchoolSchedule;
            }

            setAttributesOfTimetable(currTimetable, costCurrSchoolSchedule, getTemperature());

            this.dataRepository.addHistory(new History(iterationCounter, getTemperature(), costCurrSchoolSchedule));

            progressEvent.fire(
                    new AlgorithmProgressDTO(iterationCounter, getTemperature(), costCurrSchoolSchedule, false));

            coolTempertaure(iterationCounter);
            // decreaseTemperature();
            // decreaseTemperatureLog(200, iterationCounter);

            if (costCurrSchoolSchedule < bestCosts && costCurrSchoolSchedule > 0) {
                this.dataRepository.setBestSchoolSchedule(deepCopy(this.dataRepository.getAllTimetables()));
                bestCosts = costCurrSchoolSchedule;
            }

            if (automaticMode.get() && getTemperature() < 0.1) {
                // if (costCurrSchoolSchedule == bestCosts) {
                if (bestCosts != lastBestCost) {
                    // hitBestCostCounter--;
                }
                lastBestCost = bestCosts;
                hitBestCostCounter++;

                if (hitBestCostCounter >= 2) {
                    pauseAlgorithm();
                }
                // }
                pushTemperature(autumaticallyPushTemperatureAmount(costCurrSchoolSchedule));
            }

            this.dataRepository.getAllTimetables().put(className, currTimetable);

            iterationCounter++;
        }

        this.dataRepository.setAlgorithmRunning(false);
        // setIsRunning(true);
        progressEvent.fire(new AlgorithmProgressDTO(iterationCounter, getTemperature(), costFinal, true));
    }

    private void coolTempertaure(long iteration) {
        if (coolingMode.get() == CoolingMode.GEOMETRIC) {
            decreaseTemperature();
        } else if (coolingMode.get() == CoolingMode.LOGARITHMIC) {
            decreaseTemperatureLog(INITIAL_TEMPERATURE, iteration);
        }
    }

    private Map<String, Timetable> deepCopy(Map<String, Timetable> original) {
        Map<String, Timetable> copy = new HashMap<>();
        for (Map.Entry<String, Timetable> entry : original.entrySet()) {
            copy.put(entry.getKey(), new Timetable(entry.getValue()));
        }
        return copy;
    }

    public double autumaticallyPushTemperatureAmount(double currentCost) {
        double pushAmount = 0;
        var reverseHistory = new ArrayList<>(this.dataRepository.getHistory());
        Collections.reverse(reverseHistory);
        int counter = 0;

        for (History history : reverseHistory) {
            if (history.cost() != currentCost || pushAmount >= 100) {
                break;
            }

            if (counter == 50) {
                pushAmount += 1;
            }

            if (counter % 300 == 0) {
                pushAmount *= 2;
            }
            counter++;
        }

        return pushAmount;
    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable) {
        final int deltaCost = costNextTimeTable - costCurrTimeTable;

        if (deltaCost < 0) { // next solution is better, always accept
            return true;
        }

        final double probability = Math.exp(-deltaCost / (BOLTZMANN_CONSTANT * getTemperature()));

        System.out.println(costCurrTimeTable + " " + costNextTimeTable + " " +
                getTemperature() + " " + probability);

        return Math.random() < probability;
    }

    public void setAttributesOfTimetable(final Timetable timetable, final int cost, final double temperature) {
        timetable.setCostOfTimetable(cost);
        timetable.setTempAtTimetable(temperature);
    }

    public int determineCost(final List<Timetable> schoolSchedule) {
        // the later the period the more cost
        // if against classSubject.isBetterDoublePeriod higher cost
        // maybe different rooms
        int cost = 0;
        final List<Teacher> allTeachers = getAllTeachersInSchoolSchedule(schoolSchedule);
        final List<Room> allRooms = getAllRoomsInSchoolSchedule(schoolSchedule);

        for (final Room room : allRooms) {
            int costRoom = determineCostOfRoomAttribute(room, schoolSchedule);
            if (costRoom >= IMPOSSIBLE_COST) {
            }
            cost += costRoom;
        }

        for (final Teacher teacher : allTeachers) {
            int costTeacher = determineTeacherWorkloadCost(teacher, schoolSchedule);
            if (costTeacher >= IMPOSSIBLE_COST) {
            }
            // cost += costTeacher;
        }

        for (final Timetable timetable : schoolSchedule) {

            final Map<SchoolDays, Integer> countOfClassesPerDay = new HashMap<>();

            for (final ClassSubjectInstance classSubjectInstance : new ArrayList<>(
                    timetable.getClassSubjectInstances())) {
                final Period period = classSubjectInstance.getPeriod();

                if (period.isLunchBreak() || classSubjectInstance.getClassSubject() == null) {
                    continue; // lunch break will cause breaks
                }

                cost += determineCostOfCertainDay(period.getSchoolDays());

                cost += determineCostForClassPosition(period.getSchoolHour(), classSubjectInstance.getDuration());

                cost += determineCostForDoublePeriodAttributes(classSubjectInstance);

                if (countOfClassesPerDay.containsKey(period.getSchoolDays())) {
                    Integer currCount = countOfClassesPerDay.get(period.getSchoolDays());
                    countOfClassesPerDay.put(period.getSchoolDays(), currCount + 1);
                } else {
                    countOfClassesPerDay.put(period.getSchoolDays(), 1);
                }
            }

            cost += determineCostForSpreadOutClasses(countOfClassesPerDay);
        }

        return cost;
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
                .map(cs -> cs.getTeachers()).flatMap(List::stream)
                .filter(teacher -> teacher != null)
                .distinct()
                .toList();

    }

    private List<Room> getAllRoomsInSchoolSchedule(List<Timetable> schoolSchedule) {
        return schoolSchedule.stream()
                .flatMap(timetable -> timetable.getClassSubjectInstances().stream())
                .map(csi -> csi.getRoom())
                .filter(room -> room != null)
                .distinct()
                .toList();
    }

    public int determineCostOfCertainDay(SchoolDays day) {
        return costOfEachDay.get(day);
    }

    private int determineCostOfRoomAttribute(Room room, List<Timetable> schoolSchedule) {
        int cost = 0;

        List<ClassSubjectInstance> timetablOfRoom = schoolSchedule.stream()
                .flatMap(t -> t.getClassSubjectInstances().stream())
                .filter(c -> c.getRoom() != null)
                .filter(csi -> csi.getRoom().getId().equals(room.getId()))
                .toList();

        if (!checkIfTimetableIsValid(new Timetable(timetablOfRoom))) {
            cost += IMPOSSIBLE_COST;
        }

        return cost;
    }

    public int determineTeacherWorkloadCost(final Teacher teacher, List<Timetable> schoolSchedule) {
        int cost = 0;

        List<ClassSubjectInstance> csiList = schoolSchedule.stream()
                .flatMap(t -> t.getClassSubjectInstances().stream())
                .filter(csi -> csi.getClassSubject() != null)
                .filter(csi -> csi.getClassSubject().getTeachers().stream()
                        .anyMatch(t -> t.getId().equals(teacher.getId())))
                .toList();

        if (!checkIfTimetableIsValid(new Timetable(csiList))) {
            cost += IMPOSSIBLE_COST;
        }

        final Map<SchoolDays, Integer> hoursPerDay = new HashMap<>();

        for (final ClassSubjectInstance csi : csiList) {
            final Period period = csi.getPeriod();

            if (csi.getClassSubject() == null || period.isLunchBreak())
                continue;

            final Integer teacherHoursCost = determineCostForTeacherHours(teacher, period);
            if (teacherHoursCost >= IMPOSSIBLE_COST) {
                cost += IMPOSSIBLE_COST;
            }

            cost += teacherHoursCost;

            cost += determineCostOfCertainDay(period.getSchoolDays());

            cost += determineCostForClassPosition(period.getSchoolHour(), csi.getDuration());

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

    private int determineCostForClassPosition(int schoolHour, int duration) {
        if (schoolHour + duration > 6) {
            return (schoolHour + duration - 5) * LOW_COST;
        }
        return 0;
    }

    private int determineCostForDoublePeriodAttributes(ClassSubjectInstance classSubjectInstance) {
        if (classSubjectInstance.getClassSubject() != null
                && classSubjectInstance.getClassSubject().isBetterDoublePeriod()
                && classSubjectInstance.getDuration() == 1) {
            return MID_COST;
        }
        return 0;
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

    public boolean checkIfValueInArray(final int[] array, final int value) {
        for (final int num : array) {
            if (num == value) {
                return true;
            }
        }
        return false;
    }

    public boolean checkIfTimetableIsValid(final Timetable timetable) {
        return !TimetableManager.timetableHasOverlap(timetable);
    }

    public Timetable chooseRandomNeighborFunction(final int index1, final int index2, final Timetable currTimetable) {
        final Random random = new Random();
        final int ranNumber = random.nextInt(1, 2);

        switch (ranNumber) {
            case 1:
                return changePeriod(currTimetable, index1, currTimetable);
            // return swapPeriods(currTimetable, index1, index2);
            case 2:
                return changePeriod(currTimetable, index1, currTimetable);
        }
        return null;
    }

    public void pushTemperature(final double pushAmount) {
        final double current = getTemperature();
        setTemperature(current + pushAmount);
    }

    public Timetable swapPeriods(final Timetable timetable, final int firstIndex, final int secondIndex) {
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

    public static void setTemperature(double newValue) {
        temperature.set(Double.doubleToLongBits(newValue));
    }

    public void decreaseTemperature() {
        final double current = getTemperature();
        setTemperature(current * COOLING_RATE);
    }

    public void decreaseTemperatureLog(double T0, double k) {
        setTemperature(T0 / Math.log(k));
    }

    public void setIsRunning(boolean paused) {
        isRunning.set(paused);
    }

    public void pauseAlgorithm() {
        if (getIsRunning()) {
            isRunning.set(false);
            this.dataRepository.setAlgorithmRunning(false);
        }
    }

    public void resumeAlgorithm() {
        if (!getIsRunning()) {
            isRunning.set(true);
            this.dataRepository.setAlgorithmRunning(true);
            new Thread(this::algorithmLoop).start();
        }
    }

    public boolean getAutomaticMode() {
        return automaticMode.get();
    }

    public boolean getIsRunning() {
        return isRunning.get();
    }

    public void toggleAutomaticMode() {
        boolean toggledMode = !automaticMode.get();

        automaticMode.set(toggledMode);
        this.dataRepository.setAutomaticMode(toggledMode);
    }

}
