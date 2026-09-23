package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.HoursPeriod;
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
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@ApplicationScoped
public class SimulatedAnnealingAlgorithm {

    @Inject
    DataRepository dataRepository;

    @Inject
    jakarta.enterprise.event.Event<AlgorithmProgressDTO> progressEvent;

    private static final Map<CostDegree, Integer> costOfEachDegree =
        new HashMap<>();

    static {
        costOfEachDegree.put(CostDegree.LOW, 3);
        costOfEachDegree.put(CostDegree.MID, 10);
        costOfEachDegree.put(CostDegree.HIGH, 20);
        costOfEachDegree.put(CostDegree.SEVERE, 50);
        costOfEachDegree.put(CostDegree.IMPOSSIBLE, 100000000);
    }

    private static final Integer IMPOSSIBLE_COST = costOfEachDegree.get(
        CostDegree.IMPOSSIBLE
    ); // is to be never be
    // accepted
    private static final Integer SEVERE_COST = costOfEachDegree.get(
        CostDegree.SEVERE
    );
    private static final Integer HIGH_COST = costOfEachDegree.get(
        CostDegree.HIGH
    );
    private static final Integer MID_COST = costOfEachDegree.get(
        CostDegree.MID
    );
    private static final Integer LOW_COST = costOfEachDegree.get(
        CostDegree.LOW
    );

    private static final Map<SchoolDays, Integer> costOfEachDay =
        new HashMap<>();

    static {
        costOfEachDay.put(
            SchoolDays.MONDAY,
            costOfEachDegree.get(CostDegree.LOW)
        );
        costOfEachDay.put(
            SchoolDays.TUESDAY,
            costOfEachDegree.get(CostDegree.LOW)
        );
        costOfEachDay.put(
            SchoolDays.WEDNESDAY,
            costOfEachDegree.get(CostDegree.LOW)
        );
        costOfEachDay.put(
            SchoolDays.THURSDAY,
            costOfEachDegree.get(CostDegree.LOW)
        );
        costOfEachDay.put(
            SchoolDays.FRIDAY,
            costOfEachDegree.get(CostDegree.MID)
        );
        costOfEachDay.put(
            SchoolDays.SATURDAY,
            costOfEachDegree.get(CostDegree.IMPOSSIBLE)
        ); // is to never be accepted
    }

    /**
     * How a class's week should be shaped, all in school hours. These are the
     * knobs to turn when the plans come out too long, too lopsided or with
     * Friday still running to the ninth hour.
     */
    private static final int MIN_HOURS_PER_DAY = 4;
    private static final int MAX_HOURS_PER_DAY = 8;
    private static final int MAX_HOURS_ON_FRIDAY = 5;
    private static final int MIN_TEACHER_HOURS_PER_DAY = 4;
    private static final int LAST_COMFORTABLE_HOUR = 6;

    /** how often the cost is re-evaluated just to log where it comes from */
    private static final long COST_LOG_INTERVAL = 1000;

    /**
     * Only every HISTORY_INTERVAL-th iteration (plus every new best) goes into
     * the history. It is a copy-on-write list read by the graph, so recording
     * every iteration copied the whole history on each one and a long run
     * slowed down quadratically.
     */
    private static final long HISTORY_INTERVAL = 50;

    /**
     * Minimum time between two progress events. Firing one per iteration
     * formatted and sent a websocket message for every single move; the
     * graph only redraws every 100ms and treats 500ms of silence as the end
     * of a run, so this has to stay well below that.
     */
    private static final long PROGRESS_INTERVAL_NANOS = 50_000_000L;

    private static final SchoolDays[] SCHEDULABLE_DAYS =
        SchoolDays.schedulableDays();

    private static final int DAY_COUNT = SchoolDays.values().length;

    private final AtomicReference<CostBreakdown> lastCostBreakdown =
        new AtomicReference<>();

    private final AtomicBoolean isRunning = new AtomicBoolean(true);
    private final AtomicBoolean automaticMode = new AtomicBoolean(false);

    private final CoolingMode initCoolingMode = CoolingMode.GEOMETRIC;
    private AtomicReference<CoolingMode> coolingMode = new AtomicReference<>(
        initCoolingMode
    );

    /**
     * Soft costs move by roughly 3 to 100 per step, so at 100 a bad move is
     * still taken fairly often. Starting at 1000 spent the first third of the
     * run accepting practically everything - a random walk, not a search.
     */
    private static final double INITIAL_TEMPERATURE = 100;
    private static AtomicLong temperature = new AtomicLong(
        Double.doubleToLongBits(INITIAL_TEMPERATURE)
    );
    // private final int ITERATIONS = 10000;
    /**
     * About 69k iterations from INITIAL_TEMPERATURE down to 0.1. 0.9994 got
     * there in about 15k, barely a dozen moves per lesson for a whole school;
     * the cheaper cost evaluation pays for the longer run.
     */
    private final double COOLING_RATE = 0.9999;
    public static final double BOLTZMANN_CONSTANT = 1; // maybe adjust real constant: 1.380649e-23;

    // public static final double BOLTZMANN_CONSTANT = 1.380649e-23;

    public record History(long iteration, double temperature, long cost) {}

    public void algorithmLoop() {
        algorithmLoop(Long.MAX_VALUE);
    }

    public void algorithmLoop(final Long iterationCap) {
        this.dataRepository.setAlgorithmRunning(true);
        this.dataRepository.setAlgorithmRunningAtLeastOnce(true);
        // setTemperature(INITIAL_TEMPERATURE);
        long iterationCounter = 0;
        long costFinal = 0;
        long bestCosts = Long.MAX_VALUE;
        long lastBestCost = bestCosts;
        int hitBestCostCounter = 0;

        final Map<String, Timetable> schoolScheduleMap =
            dataRepository.getAllTimetables();
        List<Timetable> schoolSchedule = new ArrayList<>(
            schoolScheduleMap.values()
        );

        Timetable currTimetable;
        Timetable nextTimeTable;

        // the current schedule only changes when a move is accepted, so its
        // cost is carried from one iteration to the next instead of being
        // evaluated again every time - that was half of all evaluations
        long costCurrSchoolSchedule = determineCost(schoolSchedule);
        long lastCost = costCurrSchoolSchedule;
        long sameCostStreak = 0;
        long lastProgressNanos = 0;

        final Random random = ThreadLocalRandom.current();
        System.out.println(getIsRunning());
        while (getIsRunning() && iterationCounter < iterationCap) {
            // main loop
            this.coolingMode.set(this.dataRepository.getCoolingMode());
            final int randomClassIndex = random.nextInt(schoolSchedule.size());
            currTimetable = schoolSchedule.get(randomClassIndex);
            final String className = currTimetable
                .getClassSubjectInstances()
                .getFirst()
                .getClassSubject()
                .getSchoolClass()
                .getClassName();

            final int indexesAmount = currTimetable
                .getClassSubjectInstances()
                .size();
            final int ranIndex1 = random.nextInt(0, indexesAmount);
            int ranIndex2;

            do {
                ranIndex2 = random.nextInt(0, indexesAmount);
            } while (ranIndex2 == ranIndex1);
            // create 2 random non equal indexes

            if (
                currTimetable
                    .getClassSubjectInstances()
                    .get(ranIndex1)
                    .getPeriod()
                    .isLunchBreak() ||
                currTimetable
                    .getClassSubjectInstances()
                    .get(ranIndex2)
                    .getPeriod()
                    .isLunchBreak()
            ) {
                continue; // no reason to play around with lunch breaks only causes problems
            } // if more checks are needed then itll be moved to a helper method

            nextTimeTable = chooseRandomNeighborFunction(
                ranIndex1,
                ranIndex2,
                currTimetable,
                schoolSchedule
            );
            repairTimetable(nextTimeTable);

            final List<Timetable> nextSchoolSchedule = new ArrayList<>(
                schoolSchedule
            );
            nextSchoolSchedule.set(randomClassIndex, nextTimeTable);
            final long costNextSchoolSchedule = determineCost(
                nextSchoolSchedule
            );

            final boolean acceptSolution = acceptSolution(
                costCurrSchoolSchedule,
                costNextSchoolSchedule
            );
            Timetable acceptedTimetable = currTimetable;

            if (acceptSolution) {
                schoolSchedule = nextSchoolSchedule;
                costCurrSchoolSchedule = costNextSchoolSchedule;
                costFinal = costCurrSchoolSchedule;
                acceptedTimetable = nextTimeTable;
            }

            // publish the timetable the cost above was actually calculated on.
            // writing back currTimetable here meant the schedule served to the
            // UI was the one from before the accepted move, so the reported
            // cost and the visible timetable described different schedules.
            // Done before the best-schedule snapshot below so that snapshot
            // sees the accepted state too.
            this.dataRepository
                .getAllTimetables()
                .put(className, acceptedTimetable);

            setAttributesOfTimetable(
                acceptedTimetable,
                costCurrSchoolSchedule,
                getTemperature()
            );

            sameCostStreak = costCurrSchoolSchedule == lastCost
                ? sameCostStreak + 1
                : 1;
            lastCost = costCurrSchoolSchedule;

            final boolean isNewBest =
                costCurrSchoolSchedule < bestCosts &&
                costCurrSchoolSchedule > 0;

            // new bests always go in, so the minimum the graph pins is the
            // real one and not just the lowest sampled point
            if (iterationCounter % HISTORY_INTERVAL == 0 || isNewBest) {
                this.dataRepository.addHistory(
                    new History(
                        iterationCounter,
                        getTemperature(),
                        costCurrSchoolSchedule
                    )
                );
            }

            if (iterationCounter % COST_LOG_INTERVAL == 0) {
                logCostBreakdown(schoolSchedule, iterationCounter);
            }

            final long now = System.nanoTime();
            if (
                iterationCounter == 0 ||
                now - lastProgressNanos >= PROGRESS_INTERVAL_NANOS
            ) {
                progressEvent.fire(
                    new AlgorithmProgressDTO(
                        iterationCounter,
                        getTemperature(),
                        costCurrSchoolSchedule,
                        false
                    )
                );
                lastProgressNanos = now;
            }

            coolTempertaure(iterationCounter);
            // decreaseTemperature();
            // decreaseTemperatureLog(200, iterationCounter);

            if (isNewBest) {
                this.dataRepository.setBestSchoolSchedule(
                    deepCopy(this.dataRepository.getAllTimetables())
                );
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
                pushTemperature(
                    autumaticallyPushTemperatureAmount(sameCostStreak)
                );
            }

            iterationCounter++;
        }

        this.dataRepository.setAlgorithmRunning(false);
        // setIsRunning(true);
        progressEvent.fire(
            new AlgorithmProgressDTO(
                iterationCounter,
                getTemperature(),
                costFinal,
                true
            )
        );
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

    /**
     * How far to reheat after sameCostStreak iterations in a row ended on the
     * same cost. Used to walk the whole history backwards to find that streak,
     * copying it first; the loop now just counts it as it goes.
     */
    public double autumaticallyPushTemperatureAmount(final long sameCostStreak) {
        double pushAmount = 0;

        for (long counter = 0; counter < sameCostStreak; counter++) {
            if (pushAmount >= 100) {
                break;
            }

            if (counter == 50) {
                pushAmount += 1;
            }

            if (counter % 300 == 0) {
                pushAmount *= 2;
            }
        }

        return pushAmount;
    }

    public boolean acceptSolution(
        final long costCurrTimeTable,
        final long costNextTimeTable
    ) {
        final long deltaCost = costNextTimeTable - costCurrTimeTable;

        if (deltaCost < 0) {
            // next solution is better, always accept
            return true;
        }

        final double probability = Math.exp(
            -deltaCost / (BOLTZMANN_CONSTANT * getTemperature())
        );

        // no logging here: this runs twice per iteration and printing from it
        // was costing more time than evaluating the schedule. See
        // logCostBreakdown for where the cost actually comes from.
        return ThreadLocalRandom.current().nextDouble() < probability;
    }

    public void setAttributesOfTimetable(
        final Timetable timetable,
        final long cost,
        final double temperature
    ) {
        timetable.setCostOfTimetable(cost);
        timetable.setTempAtTimetable(temperature);
    }

    public long determineCost(final List<Timetable> schoolSchedule) {
        return determineCost(schoolSchedule, null);
    }

    /**
     * Cost of a whole school schedule.
     *
     * breakdown may be null: the annealing loop evaluates a schedule twice per
     * iteration and has no use for the split, so it skips building the map and
     * only asks for one when the breakdown is about to be logged.
     */
    public long determineCost(
        final List<Timetable> schoolSchedule,
        final CostBreakdown breakdown
    ) {
        // accumulated as a long: a handful of IMPOSSIBLE_COST violations
        // overflows an int and would turn an illegal schedule into a cheap one
        long cost = 0;

        // one pass sorts every lesson under its teachers and its room. Each
        // teacher and each room used to scan the whole school for its own
        // lessons, which made this teachers x lessons instead of lessons.
        // Teachers are keyed by id on purpose: the entities carry no equals(),
        // and the same teacher loaded twice must not be counted twice.
        final Map<Long, Teacher> teachersById = new HashMap<>();
        final Map<Long, List<ClassSubjectInstance>> lessonsByTeacher =
            new HashMap<>();
        final Map<Object, List<ClassSubjectInstance>> lessonsByRoom =
            new HashMap<>();

        for (final Timetable timetable : schoolSchedule) {
            for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                final Room room = csi.getRoom();

                if (room != null) {
                    lessonsByRoom
                        .computeIfAbsent(
                            room.getId() != null ? room.getId() : room,
                            key -> new ArrayList<>()
                        )
                        .add(csi);
                }

                if (
                    csi.getClassSubject() == null ||
                    csi.getClassSubject().getTeachers() == null
                ) {
                    continue;
                }

                for (final Teacher teacher : csi
                    .getClassSubject()
                    .getTeachers()) {
                    if (teacher == null || teacher.getId() == null) {
                        continue;
                    }

                    teachersById.putIfAbsent(teacher.getId(), teacher);
                    final List<ClassSubjectInstance> lessons =
                        lessonsByTeacher.computeIfAbsent(
                            teacher.getId(),
                            id -> new ArrayList<>()
                        );

                    // a lesson listing the same teacher twice is still one
                    // lesson of theirs
                    if (lessons.isEmpty() || lessons.getLast() != csi) {
                        lessons.add(csi);
                    }
                }
            }
        }

        for (final List<ClassSubjectInstance> lessonsInRoom : lessonsByRoom.values()) {
            // same reasoning as for teachers: count the clashes, do not just
            // flag that there is at least one
            cost += charge(
                breakdown,
                CostCategory.ROOM_CLASH,
                (long) TimetableManager.countOverlappingHours(lessonsInRoom) *
                IMPOSSIBLE_COST
            );
        }

        for (final Map.Entry<Long, List<ClassSubjectInstance>> entry : lessonsByTeacher.entrySet()) {
            cost += teacherWorkloadCost(
                teachersById.get(entry.getKey()),
                entry.getValue(),
                breakdown
            );
        }

        for (final Timetable timetable : schoolSchedule) {
            // hours, not lessons: a double period fills two hours of the day,
            // and the day length rules below are only meaningful in hours.
            // Indexed by SchoolDays.ordinal().
            final int[] hoursPerDay = new int[DAY_COUNT];
            final Integer[] lunchBreakHourPerDay = new Integer[DAY_COUNT];

            for (final ClassSubjectInstance classSubjectInstance : timetable.getClassSubjectInstances()) {
                final Period period = classSubjectInstance.getPeriod();

                if (period.isLunchBreak()) {
                    // noted, not costed here: the break carries no lesson, its
                    // position is priced once per day below
                    lunchBreakHourPerDay[period
                        .getSchoolDays()
                        .ordinal()] = period.getSchoolHour();
                    continue;
                }

                if (classSubjectInstance.getClassSubject() == null) {
                    continue;
                }

                cost += charge(
                    breakdown,
                    CostCategory.DAY_OF_WEEK,
                    determineCostOfCertainDay(period.getSchoolDays())
                );

                cost += charge(
                    breakdown,
                    CostCategory.LATE_HOURS,
                    determineCostForClassPosition(
                        period.getSchoolHour(),
                        classSubjectInstance.getDuration(),
                        period.getSchoolDays()
                    )
                );

                cost += charge(
                    breakdown,
                    CostCategory.DOUBLE_PERIOD,
                    determineCostForDoublePeriodAttributes(
                        classSubjectInstance
                    )
                );

                hoursPerDay[period.getSchoolDays().ordinal()] +=
                    classSubjectInstance.getDuration();
            }

            for (final SchoolDays day : SCHEDULABLE_DAYS) {
                cost += charge(
                    breakdown,
                    CostCategory.DAY_LENGTH,
                    determineCostForDayLength(day, hoursPerDay[day.ordinal()])
                );

                cost += charge(
                    breakdown,
                    CostCategory.LUNCH_BREAK_POSITION,
                    determineCostForLunchBreakPosition(
                        lunchBreakHourPerDay[day.ordinal()],
                        hoursPerDay[day.ordinal()]
                    )
                );
            }

            cost += charge(
                breakdown,
                CostCategory.DAY_BALANCE,
                determineCostForDayBalance(hoursPerDay)
            );
        }

        return cost;
    }

    /**
     * Records amount under category when a breakdown is being collected, and
     * hands it back either way so call sites stay a plain "cost += ...".
     */
    private static long charge(
        final CostBreakdown breakdown,
        final CostCategory category,
        final long amount
    ) {
        if (breakdown != null) {
            breakdown.add(category, amount);
        }
        return amount;
    }

    private void logCostBreakdown(
        final List<Timetable> schoolSchedule,
        final long iteration
    ) {
        final CostBreakdown breakdown = new CostBreakdown();
        determineCost(schoolSchedule, breakdown);
        lastCostBreakdown.set(breakdown);
        System.out.println(
            "iteration " + iteration + " cost " + breakdown.format()
        );

        if (breakdown.get(CostCategory.TEACHER_NON_WORKING) > 0) {
            // the one cost that can survive a whole run without ever moving -
            // naming the hours says straight away whether what is left is a
            // schedule the algorithm cannot reach or input it cannot satisfy
            System.out.println(
                "  on non working hours: " +
                String.join(", ", describeNonWorkingViolations(schoolSchedule))
            );
        }
    }

    /**
     * The lessons sitting on an hour one of their teachers does not work, as
     * "teacher / class / DAY-hour". Built only when the log above is about to
     * report some, so it never runs in the annealing loop.
     */
    public List<String> describeNonWorkingViolations(
        final List<Timetable> schoolSchedule
    ) {
        final List<String> violations = new ArrayList<>();

        for (final Timetable timetable : schoolSchedule) {
            for (final ClassSubjectInstance csi : new ArrayList<>(
                timetable.getClassSubjectInstances()
            )) {
                final Period period = csi.getPeriod();

                if (period.isLunchBreak() || csi.getClassSubject() == null) {
                    continue;
                }

                final List<Teacher> teachers = csi
                    .getClassSubject()
                    .getTeachers();

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
                        hour.setDay(period.getSchoolDays());
                        hour.setSchoolHour(period.getSchoolHour() + i);

                        if (!teacher.checkIfHourExistsInNonWorkingList(hour)) {
                            continue;
                        }

                        violations.add(
                            teacher.getTeacherName() +
                            " / " +
                            classNameOf(csi) +
                            " / " +
                            period.getSchoolDays() +
                            "-" +
                            (period.getSchoolHour() + i)
                        );
                    }
                }
            }
        }

        return violations;
    }

    private static String classNameOf(final ClassSubjectInstance csi) {
        if (
            csi.getClassSubject() == null ||
            csi.getClassSubject().getSchoolClass() == null
        ) {
            return "?";
        }
        return csi.getClassSubject().getSchoolClass().getClassName();
    }

    /** Where the cost stood at the last logged iteration, split by category. */
    public CostBreakdown getLastCostBreakdown() {
        return lastCostBreakdown.get();
    }

    public void repairTimetable(final Timetable timetable) {
        // lunch breaks are derived state, not placed state: they are dropped
        // here and recomputed at the end of every repair. Carrying them over
        // let them ratchet - closing gaps only ever pulls a break earlier,
        // nothing could push it back, and the annealer never moves one, so
        // every day ended up with its break in the first hour.
        timetable
            .getClassSubjectInstances()
            .removeIf(csi -> csi.getClassSubject() == null);

        for (final SchoolDays day : SchoolDays.values()) {
            final List<ClassSubjectInstance> classesOnDay = timetable
                .getClassSubjectInstances()
                .stream()
                .filter(e -> e.getPeriod().getSchoolDays() == day)
                .sorted(
                    Comparator.comparingInt(e -> e.getPeriod().getSchoolHour())
                )
                .toList();

            moveDayToStartAtFirstHour(timetable, classesOnDay);
            closeAllGapsBetweenInstances(timetable, classesOnDay);
            TimetableManager.implementLunchBreakOnDay(timetable, day);
        }
    }

    public void moveDayToStartAtFirstHour(
        final Timetable timetable,
        final List<ClassSubjectInstance> classesOnDay
    ) {
        if (classesOnDay.isEmpty()) {
            return;
        }

        final Period firstClassOfTheDay = classesOnDay.getFirst().getPeriod();

        if (firstClassOfTheDay.getSchoolHour() != 1) {
            firstClassOfTheDay.setSchoolHour(1);
        }
    }

    public void closeAllGapsBetweenInstances(
        final Timetable timetable,
        final List<ClassSubjectInstance> classesOnDay
    ) {
        for (int i = 0; i < classesOnDay.size() - 1; i++) {
            final int currentEndOfClass =
                classesOnDay.get(i).getPeriod().getSchoolHour() +
                classesOnDay.get(i).getDuration();
            final Period nextPeriod = classesOnDay.get(i + 1).getPeriod();

            if (nextPeriod.getSchoolHour() > currentEndOfClass) {
                // just means if the next class starts at a time
                // bigger than what the previous class ended, hence
                // resulting in a gap
                nextPeriod.setSchoolHour(currentEndOfClass);
            }
        }
    }

    public List<Teacher> getAllTeachersInSchoolSchedule(
        final List<Timetable> schoolSchedule
    ) {
        // deduplicated by id on purpose: the entities carry no equals(), so
        // distinct() compares by identity and the same teacher loaded twice
        // would have every violation counted twice
        final Map<Long, Teacher> byId = new LinkedHashMap<>();

        schoolSchedule
            .stream()
            .flatMap(timetable -> timetable.getClassSubjectInstances().stream())
            .map(csi -> csi.getClassSubject())
            .filter(cs -> cs != null)
            .map(cs -> cs.getTeachers())
            .filter(teachers -> teachers != null)
            .flatMap(List::stream)
            .filter(teacher -> teacher != null && teacher.getId() != null)
            .forEach(teacher -> byId.putIfAbsent(teacher.getId(), teacher));

        return List.copyOf(byId.values());
    }

    public int determineCostOfCertainDay(SchoolDays day) {
        return costOfEachDay.get(day);
    }

    public long determineTeacherWorkloadCost(
        final Teacher teacher,
        List<Timetable> schoolSchedule
    ) {
        return determineTeacherWorkloadCost(teacher, schoolSchedule, null);
    }

    public long determineTeacherWorkloadCost(
        final Teacher teacher,
        List<Timetable> schoolSchedule,
        final CostBreakdown breakdown
    ) {
        final List<ClassSubjectInstance> csiList = new ArrayList<>();

        for (final Timetable timetable : schoolSchedule) {
            for (final ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                if (
                    csi.getClassSubject() != null &&
                    csi.getClassSubject().getTeachers() != null &&
                    csi
                        .getClassSubject()
                        .getTeachers()
                        .stream()
                        .anyMatch(t -> t.getId().equals(teacher.getId()))
                ) {
                    csiList.add(csi);
                }
            }
        }

        return teacherWorkloadCost(teacher, csiList, breakdown);
    }

    /** Workload cost of one teacher, given every lesson they teach. */
    private long teacherWorkloadCost(
        final Teacher teacher,
        final List<ClassSubjectInstance> csiList,
        final CostBreakdown breakdown
    ) {
        long cost = 0;

        // scaled by the number of clashing hours so that resolving one of
        // several clashes is already an improvement the algorithm can follow
        cost += charge(
            breakdown,
            CostCategory.TEACHER_CLASH,
            (long) TimetableManager.countOverlappingHours(csiList) *
            IMPOSSIBLE_COST
        );

        // read once per teacher into bitmasks instead of searching the lists
        // with a freshly allocated hour object for every lesson hour
        final long[] nonWorking = hourMask(
            teacher.getTeacher_non_working_hours()
        );
        final long[] nonPreferred = hourMask(
            teacher.getTeacher_non_preferred_hours()
        );
        final int[] hoursPerDay = new int[DAY_COUNT];

        for (final ClassSubjectInstance csi : csiList) {
            final Period period = csi.getPeriod();

            if (
                csi.getClassSubject() == null || period.isLunchBreak()
            ) continue;

            final int day = period.getSchoolDays().ordinal();

            // every hour the lesson spans has to be checked, not just the
            // one it starts on: a double period could otherwise sit on a
            // teacher's non working hours with only its first hour costed
            for (int i = 0; i < csi.getDuration(); i++) {
                final int hour = period.getSchoolHour() + i;

                if (maskContains(nonWorking, day, hour)) {
                    // is to be never be accepted
                    cost += charge(
                        breakdown,
                        CostCategory.TEACHER_NON_WORKING,
                        IMPOSSIBLE_COST
                    );
                } else if (maskContains(nonPreferred, day, hour)) {
                    cost += charge(
                        breakdown,
                        CostCategory.TEACHER_NON_PREFERRED,
                        SEVERE_COST
                    );
                }
            }

            // the cost of the day and of the position in the day belong to
            // the lesson, not to the teacher - determineCost already charges
            // both once per lesson. Charging them again here multiplied them
            // by the number of teachers and distorted the whole landscape.

            // durations, not lesson count: a double period is two hours of
            // the teacher's day and the rule below is about hours worked
            hoursPerDay[day] += csi.getDuration();
        }

        for (final int hours : hoursPerDay) {
            cost += charge(
                breakdown,
                CostCategory.TEACHER_SHORT_DAY,
                determineCostForTeacherDayLength(hours)
            );
        }
        return cost;
    }

    /**
     * One long per day, bit n set when hour n is in the list. Hours outside
     * 0..63 cannot be stored and are left out - no school day gets near that.
     */
    private static long[] hourMask(final List<? extends HoursPeriod> hours) {
        final long[] mask = new long[DAY_COUNT];

        if (hours == null) {
            return mask;
        }

        for (final HoursPeriod hour : hours) {
            if (
                hour == null ||
                hour.getDay() == null ||
                hour.getSchoolHour() == null ||
                hour.getSchoolHour() < 0 ||
                hour.getSchoolHour() > 63
            ) {
                continue;
            }
            mask[hour.getDay().ordinal()] |= 1L << hour.getSchoolHour();
        }

        return mask;
    }

    private static boolean maskContains(
        final long[] mask,
        final int day,
        final int hour
    ) {
        return hour >= 0 && hour <= 63 && (mask[day] & (1L << hour)) != 0;
    }

    /**
     * Cost of a teacher coming in for only a couple of hours on a day.
     *
     * Days the teacher does not work at all are free, so this must stay a soft,
     * smoothly growing penalty: the stepped version it replaces jumped from 0
     * to SEVERE the moment a day got its first lesson, which made emptying a
     * day the cheapest fix and pushed every teacher's hours into a few long
     * days - the same mistake the class day rule used to make.
     */
    public long determineCostForTeacherDayLength(final int hours) {
        if (hours <= 0 || hours >= MIN_TEACHER_HOURS_PER_DAY) {
            return 0;
        }

        final int missing = MIN_TEACHER_HOURS_PER_DAY - hours;
        return (long) missing * missing * MID_COST;
    }

    private int determineCostForClassPosition(
        final int schoolHour,
        final int duration,
        final SchoolDays day
    ) {
        // the end hour, not start + duration: the old form charged a lesson
        // that ends exactly on the last comfortable hour as if it ran past it
        final int endHour = schoolHour + duration - 1;

        if (endHour <= LAST_COMFORTABLE_HOUR) {
            return 0;
        }

        final int hoursOver = endHour - LAST_COMFORTABLE_HOUR;
        // quadratic, so the ninth hour hurts far more than the seventh. The old
        // linear form priced a late hour at barely more than an early one, and
        // the day length rules could always outbid it.
        // Friday is weighted harder so late Friday hours are the first thing
        // the algorithm gives up.
        final int weight = day == SchoolDays.FRIDAY ? MID_COST : LOW_COST;

        return hoursOver * hoursOver * weight;
    }

    private int determineCostForDoublePeriodAttributes(
        ClassSubjectInstance classSubjectInstance
    ) {
        if (
            classSubjectInstance.getClassSubject() != null &&
            classSubjectInstance.getClassSubject().isBetterDoublePeriod() &&
            classSubjectInstance.getDuration() == 1
        ) {
            return MID_COST;
        }
        return 0;
    }

    public int determineCostForTeacherHours(
        final Teacher teacher,
        final Period period
    ) {
        return determineCostForTeacherHours(teacher, period, null);
    }

    public int determineCostForTeacherHours(
        final Teacher teacher,
        final Period period,
        final CostBreakdown breakdown
    ) {
        final TeacherNonWorkingHours teacherNonWorkingHour =
            new TeacherNonWorkingHours();
        teacherNonWorkingHour.setDay(period.getSchoolDays());
        teacherNonWorkingHour.setSchoolHour(period.getSchoolHour());
        if (teacher.checkIfHourExistsInNonWorkingList(teacherNonWorkingHour)) {
            // is to be never be accepted
            return (int) charge(
                breakdown,
                CostCategory.TEACHER_NON_WORKING,
                IMPOSSIBLE_COST
            );
        }

        final TeacherNonPreferredHours teacherNonPreferredHours =
            new TeacherNonPreferredHours();
        teacherNonPreferredHours.setDay(period.getSchoolDays());
        teacherNonPreferredHours.setSchoolHour(period.getSchoolHour());
        if (
            teacher.checkIfHourExistsInNonPreferredList(
                teacherNonPreferredHours
            )
        ) {
            return (int) charge(
                breakdown,
                CostCategory.TEACHER_NON_PREFERRED,
                SEVERE_COST
            );
        }

        return 0;
    }

    /**
     * Cost of a class day being too short or too long.
     *
     * Replaces a rule that charged a flat SEVERE for any day with fewer than
     * three lessons and nothing at all for an empty day - so the cheapest way
     * to satisfy it was to drain the short days and pile their hours onto the
     * rest. That is what produced nine hour Fridays next to two hour Mondays.
     *
     * Both ends are priced here, and the penalty grows quadratically so the
     * annealer gets a gradient it can walk down an hour at a time instead of a
     * cliff it can only jump off.
     */
    public long determineCostForDayLength(
        final SchoolDays day,
        final int hours
    ) {
        if (hours <= 0) {
            return 0; // a genuinely free day is allowed; DAY_BALANCE prices it
        }

        long cost = 0;

        if (hours < MIN_HOURS_PER_DAY) {
            final int missing = MIN_HOURS_PER_DAY - hours;
            cost += (long) missing * missing * MID_COST;
        }

        final int maxHours = maxHoursOnDay(day);

        if (hours > maxHours) {
            final int excess = hours - maxHours;
            cost += (long) excess * excess * HIGH_COST;
        }

        return cost;
    }

    /**
     * Friday is capped shorter than the rest of the week. This cap, not the
     * flat per lesson surcharge in costOfEachDay, is what actually keeps Friday
     * short: that surcharge is the same for every lesson and the number of
     * lessons is fixed, so on its own it hardly moves the total at all.
     */
    public int maxHoursOnDay(final SchoolDays day) {
        return day == SchoolDays.FRIDAY
            ? MAX_HOURS_ON_FRIDAY
            : MAX_HOURS_PER_DAY;
    }

    /**
     * Cost of a day's lunch break sitting away from the middle of that day.
     *
     * Deliberately soft and deliberately small: a break may only go between two
     * lessons, so a double period lying across the middle pushes it off centre
     * and that has to stay allowed. This only makes the more centred placement
     * the cheaper one, so of two otherwise equal schedules the annealer keeps
     * the one that leaves room for a break near the middle.
     *
     * A day without a break costs nothing here - whether it should have one is
     * decided by its length in TimetableManager, not priced.
     */
    public long determineCostForLunchBreakPosition(
        final Integer breakHour,
        final int lessonHours
    ) {
        if (breakHour == null || lessonHours <= 0) {
            return 0;
        }

        final int deviation = Math.abs(
            breakHour - TimetableManager.idealLunchBreakHour(lessonHours)
        );

        return (long) deviation * deviation * LOW_COST;
    }

    /**
     * Cost of a class's days being of very uneven length, measured across
     * Monday to Thursday only.
     *
     * Friday is deliberately left out: it is meant to be the short day, and
     * counting it here would make this rule pull against maxHoursOnDay.
     */
    public long determineCostForDayBalance(final int[] hoursPerDay) {
        int max = Integer.MIN_VALUE;
        int min = Integer.MAX_VALUE;

        for (final SchoolDays day : SCHEDULABLE_DAYS) {
            if (day == SchoolDays.FRIDAY) {
                continue;
            }

            final int hours = hoursPerDay[day.ordinal()];
            max = Math.max(max, hours);
            min = Math.min(min, hours);
        }

        if (max <= min) {
            return 0;
        }

        final int spread = max - min;
        return (long) spread * spread * LOW_COST;
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

    public Timetable chooseRandomNeighborFunction(
        final int index1,
        final int index2,
        final Timetable currTimetable,
        final List<Timetable> schoolSchedule
    ) {
        // nextInt(1, 2) can only ever return 1, so both the swap and the
        // insertion below were dead and the search was left with a single kind
        // of move
        final int ranNumber = ThreadLocalRandom.current().nextInt(1, 4);

        switch (ranNumber) {
            case 1:
                return changePeriod(currTimetable, index1, schoolSchedule);
            case 2:
                return insertPeriod(currTimetable, index1, schoolSchedule);
            case 3:
                return swapPeriods(currTimetable, index1, index2);
        }
        return null;
    }

    public void pushTemperature(final double pushAmount) {
        final double current = getTemperature();
        setTemperature(current + pushAmount);
    }

    public Timetable swapPeriods(
        final Timetable timetable,
        final int firstIndex,
        final int secondIndex
    ) {
        return TimetableManager.switchTwoClassSubjectInstancesAndReturn(
            timetable,
            firstIndex,
            secondIndex
        );
    }

    private List<Period> freePeriodsFor(
        final Timetable timetable,
        final int index,
        final Map<SchoolDays, Set<Integer>> blockedHours
    ) {
        final int duration = timetable
            .getClassSubjectInstances()
            .get(index)
            .getDuration();
        final List<Period> periods = new ArrayList<>();

        for (final SchoolDays day : SCHEDULABLE_DAYS) {
            periods.addAll(
                TimetableManager.returnAllFreePeriodsOnCertainDay(
                    timetable,
                    day,
                    duration,
                    blockedHours
                )
            );
        }

        return periods;
    }

    private List<Period> insertionPeriodsFor(
        final Timetable timetable,
        final int index,
        final Map<SchoolDays, Set<Integer>> blockedHours
    ) {
        final List<Period> periods = new ArrayList<>();

        for (final SchoolDays day : SCHEDULABLE_DAYS) {
            periods.addAll(
                TimetableManager.returnAllInsertionPeriodsOnCertainDay(
                    timetable,
                    day,
                    index,
                    blockedHours
                )
            );
        }

        return periods;
    }

    private List<Period> candidatesFor(
        final Timetable timetable,
        final int index,
        final Map<SchoolDays, Set<Integer>> blockedHours,
        final boolean insertion
    ) {
        return insertion
            ? insertionPeriodsFor(timetable, index, blockedHours)
            : freePeriodsFor(timetable, index, blockedHours);
    }

    /**
     * Candidates that stay away from the hours the lesson's teachers already
     * teach in other classes and from the hours they do not work at all.
     * Both cost IMPOSSIBLE: blocking only the clashes meant the generator kept
     * offering destinations exactly as illegal as where the lesson already
     * sat, which is how a non working hour could survive a whole run.
     *
     * Falls back to blocking the clashes only when that leaves nothing at all
     * - a lesson that can go nowhere legal must still be able to move,
     * otherwise it is frozen for the rest of the run and the cost function
     * never gets a chance to weigh it.
     *
     * The clashes are collected once and reused for the fallback; that scan
     * over the whole school is the expensive part of a move.
     */
    private List<Period> candidatesWithFallback(
        final Timetable timetable,
        final int index,
        final List<Timetable> schoolSchedule,
        final boolean insertion
    ) {
        final ClassSubjectInstance instance = timetable
            .getClassSubjectInstances()
            .get(index);
        final Map<SchoolDays, Set<Integer>> clashes =
            TimetableManager.collectTeacherOccupiedHours(
                schoolSchedule,
                timetable,
                TimetableManager.teacherIdsOf(instance)
            );

        final List<Period> strict = candidatesFor(
            timetable,
            index,
            TimetableManager.mergeBlockedHours(
                clashes,
                TimetableManager.collectNonWorkingHours(instance)
            ),
            insertion
        );

        if (!strict.isEmpty()) {
            return strict;
        }

        return candidatesFor(timetable, index, clashes, insertion);
    }

    /** Moves a lesson to an hour that is free in this class as it stands. */
    public Timetable changePeriod(
        final Timetable timetable,
        final int index,
        final List<Timetable> schoolSchedule
    ) {
        final List<Period> candidates = candidatesWithFallback(
            timetable,
            index,
            schoolSchedule,
            false
        );

        if (candidates.isEmpty()) {
            // no legal move at all - hand back an unchanged copy rather than
            // forcing an illegal one
            return TimetableManager.cloneCurrentTimeTable(timetable);
        }

        return TimetableManager.switchClassSubjectInstancePeriodAndReturn(
            timetable,
            index,
            candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()))
        );
    }

    /**
     * Pushes a lesson in between two others and slides the rest of that day
     * right. changePeriod alone can only ever append to the end of a day, since
     * repair leaves no free hour anywhere else, so without this the order
     * inside a day can never change.
     */
    public Timetable insertPeriod(
        final Timetable timetable,
        final int index,
        final List<Timetable> schoolSchedule
    ) {
        final List<Period> candidates = candidatesWithFallback(
            timetable,
            index,
            schoolSchedule,
            true
        );

        if (candidates.isEmpty()) {
            return TimetableManager.cloneCurrentTimeTable(timetable);
        }

        return TimetableManager.insertClassSubjectInstanceAndReturn(
            timetable,
            index,
            candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()))
        );
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
