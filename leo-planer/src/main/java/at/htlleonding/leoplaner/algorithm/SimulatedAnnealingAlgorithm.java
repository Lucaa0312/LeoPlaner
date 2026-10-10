package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.algorithm.TeacherWishes.LinkedPair;
import at.htlleonding.leoplaner.algorithm.TeacherWishes.LoadedWishes;
import at.htlleonding.leoplaner.algorithm.TeacherWishes.WishState;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import at.htlleonding.leoplaner.dto.RunStatusDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Anneals the school's Schedule: proposes a move, lets the Schedule price it
 * and keeps or undoes it by the Metropolis rule. What a schedule costs and
 * which moves exist lives in Schedule and CostModel; this class only runs the
 * search and reports on it.
 */
@ApplicationScoped
public class SimulatedAnnealingAlgorithm {

    @Inject
    DataRepository dataRepository;

    @Inject
    jakarta.enterprise.event.Event<AlgorithmProgressDTO> progressEvent;

    /** how often the cost is split up and logged */
    private static final long COST_LOG_INTERVAL = 20_000;

    /**
     * Only every HISTORY_INTERVAL-th iteration (plus every new best) goes into
     * the history. It is a copy-on-write list read by the graph, so recording
     * every iteration copied the whole history on each one and a long run
     * slowed down quadratically.
     */
    private static final long HISTORY_INTERVAL = 500;

    /**
     * Minimum time between two progress events. The graph only redraws every
     * 100ms and treats 500ms of silence as the end of a run, so this has to
     * stay well below that.
     */
    private static final long PROGRESS_INTERVAL_NANOS = 50_000_000L;

    /** Minimum time between two refreshes of the timetables the UI reads. */
    private static final long PUBLISH_INTERVAL_NANOS = 500_000_000L;

    /**
     * What all of one teacher's wishes may weigh together at full strength.
     * A teacher asking for more gets every wish scaled down, so whoever writes
     * the longest text does not outvote everyone who wrote one line.
     */
    private static final int WISH_BUDGET_PER_TEACHER = 150;
    /** gap hours a NO_GAPS wish lets through per day - one is the lunch break */
    static final int WISH_GAP_HOURS_ALLOWED = 1;

    private final AtomicReference<CostBreakdown> lastCostBreakdown = new AtomicReference<>();

    private final AtomicReference<WishState> wishState = new AtomicReference<>(WishState.EMPTY);

    private final AtomicBoolean isRunning = new AtomicBoolean(true);
    private final AtomicBoolean automaticMode = new AtomicBoolean(false);

    private final CoolingMode initCoolingMode = CoolingMode.GEOMETRIC;
    private AtomicReference<CoolingMode> coolingMode = new AtomicReference<>(initCoolingMode);

    /**
     * Where the temperature stands before a run has measured its own start,
     * and the start of a schedule too small to measure one on.
     */
    private static final double INITIAL_TEMPERATURE = 100;
    private static AtomicLong temperature = new AtomicLong(Double.doubleToLongBits(INITIAL_TEMPERATURE));

    /**
     * Share of the worsening moves a run accepts at its start. The start
     * temperature is measured for that on the schedule at hand, so it follows
     * the weights in CostModel instead of having to be retuned with them.
     */
    private static final double START_ACCEPTANCE = 0.4;
    private static final int CALIBRATION_MOVES = 2_000;
    private static final double MAX_START_TEMPERATURE = 1000;
    /** what the current run started at, the reference for reheating */
    private volatile double startTemperature = INITIAL_TEMPERATURE;

    /** below this next to nothing is accepted anymore and a run has cooled out */
    private static final double MIN_TEMPERATURE = 0.1;
    /** automatic mode reheats to this share of the start temperature */
    private static final double REHEAT_FRACTION = 0.25;

    /**
     * About a million iterations from the start temperature down to 0.1. A move
     * only re-costs what it touches, so that is around ten seconds for the
     * whole school, which is what its 1600 blocks need to reach zero hard
     * violations reliably.
     */
    static final double COOLING_RATE = 0.999993;
    public static final double BOLTZMANN_CONSTANT = 1;

    public record History(long iteration, double temperature, long cost) {
    }

    public void algorithmLoop() {
        algorithmLoop(Long.MAX_VALUE);
    }

    public void algorithmLoop(final Long iterationCap) {
        run(iterationCap, true);
    }

    /**
     * A fresh run measures its start temperature first; a resumed one carries
     * on at the temperature it was paused at.
     */
    private void run(final long iterationCap, final boolean fresh) {
        final Schedule schedule = dataRepository.getSchedule();
        final RunState run = dataRepository.getRunState();
        if (schedule == null || schedule.getBlocks().isEmpty()) {
            run.reset();
            this.dataRepository.setAlgorithmRunning(false);
            progressEvent.fire(new AlgorithmProgressDTO(0, getTemperature(), 0, true, run.snapshot()));
            return;
        }
        // before the cost is read below: setting wishes recounts it
        for (final String rejected : setTeacherWishProfiles(dataRepository.getTeacherWishProfiles())) {
            System.out.println("Teacher wish rejected: " + rejected);
        }

        this.dataRepository.setAlgorithmRunning(true);
        run.loopStarted();
        this.dataRepository.setAlgorithmRunningAtLeastOnce(true);
        long iterationCounter = 0;
        long bestCosts = Long.MAX_VALUE;
        int hitBestCostCounter = 0;

        final Random random = ThreadLocalRandom.current();
        if (fresh) {
            startTemperature = calibrateTemperature(schedule, random);
            setTemperature(startTemperature);
        }

        long currentCost = schedule.getTotalCost();
        long lastProgressNanos = 0;
        long lastPublishNanos = System.nanoTime();

        while (getIsRunning() && iterationCounter < iterationCap) {
            this.coolingMode.set(this.dataRepository.getCoolingMode());

            final long delta = schedule.proposeAndApply(random);
            if (delta != Schedule.NO_MOVE) {
                if (acceptSolution(currentCost, currentCost + delta)) {
                    schedule.commit();
                    currentCost += delta;
                } else {
                    schedule.rollback();
                }
            }

            final boolean isNewBest = currentCost < bestCosts;
            if (isNewBest) {
                bestCosts = currentCost;
                this.dataRepository.getTimetableService().setBest(schedule.snapshot(), currentCost);
            }

            // new bests always go in, so the minimum the graph pins is the
            // real one and not just the lowest sampled point
            if (iterationCounter % HISTORY_INTERVAL == 0 || isNewBest) {
                this.dataRepository.addHistory(new History(iterationCounter, getTemperature(), currentCost));
            }

            if (iterationCounter % COST_LOG_INTERVAL == 0) {
                logCostBreakdown(schedule, iterationCounter);
            }

            final long now = System.nanoTime();
            if (iterationCounter == 0 || now - lastProgressNanos >= PROGRESS_INTERVAL_NANOS) {
                run.progress(iterationCounter, getTemperature(), bestCosts);
                progressEvent.fire(new AlgorithmProgressDTO(iterationCounter, getTemperature(), currentCost, false,
                        run.snapshot()));
                lastProgressNanos = now;
            }
            if (now - lastPublishNanos >= PUBLISH_INTERVAL_NANOS) {
                this.dataRepository.getTimetableService().publish();
                lastPublishNanos = now;
            }

            coolTempertaure(iterationCounter);

            // Automatic (Einfach) mode: cold once, reheat itself; cold twice, the round is
            // over.
            // The run state decides whether another round follows or the run is finished.
            if (automaticMode.get() && getTemperature() < MIN_TEMPERATURE) {
                hitBestCostCounter++;

                if (hitBestCostCounter < 2) {
                    run.selfReheated();
                    setTemperature(startTemperature * REHEAT_FRACTION);
                } else if (run.roundEnded(bestCosts)) {
                    hitBestCostCounter = 0;
                    setTemperature(RunState.ROUND_REHEAT);
                } else {
                    pauseAlgorithm();
                }
            }

            iterationCounter++;
        }

        this.dataRepository.getTimetableService().publish();
        logCostBreakdown(schedule, iterationCounter);
        run.progress(iterationCounter, getTemperature(), bestCosts);
        run.stopped();
        this.dataRepository.setAlgorithmRunning(false);
        progressEvent.fire(new AlgorithmProgressDTO(iterationCounter, getTemperature(), currentCost, true,
                run.snapshot()));
    }

    /**
     * The same search without the application around it - no history, no
     * events, no pausing - for tests and benchmarks. Returns the final cost.
     */
    public static long anneal(final Schedule schedule, final long iterations, final double startTemperature,
            final double coolingRate, final Random random) {
        long cost = schedule.getTotalCost();
        double temperature = startTemperature;
        for (long i = 0; i < iterations; i++) {
            final long delta = schedule.proposeAndApply(random);
            if (delta != Schedule.NO_MOVE) {
                if (delta < 0 || random.nextDouble() < Math.exp(-delta / (BOLTZMANN_CONSTANT * temperature))) {
                    schedule.commit();
                    cost += delta;
                } else {
                    schedule.rollback();
                }
            }
            temperature *= coolingRate;
        }
        return cost;
    }

    /**
     * The temperature at which the typical worsening move of this schedule is
     * accepted START_ACCEPTANCE of the time: tries moves without keeping any
     * and takes the median worsening - the mean is useless here, a few day
     * swaps cost a hundred times what a single lesson does. Moves that break
     * a hard rule are left out, they are not meant to be accepted at all.
     */
    public static double calibrateTemperature(final Schedule schedule, final Random random) {
        final long[] worsening = new long[CALIBRATION_MOVES];
        int count = 0;
        for (int i = 0; i < CALIBRATION_MOVES; i++) {
            final long delta = schedule.proposeAndApply(random);
            schedule.rollback();
            if (delta != Schedule.NO_MOVE && delta > 0 && delta < CostModel.IMPOSSIBLE_COST / 2) {
                worsening[count++] = delta;
            }
        }
        if (count == 0) {
            return INITIAL_TEMPERATURE;
        }
        java.util.Arrays.sort(worsening, 0, count);
        final double measured = worsening[count / 2] / -Math.log(START_ACCEPTANCE);
        return Math.max(1, Math.min(MAX_START_TEMPERATURE, measured));
    }

    private void coolTempertaure(long iteration) {
        if (coolingMode.get() == CoolingMode.GEOMETRIC) {
            decreaseTemperature();
        } else if (coolingMode.get() == CoolingMode.LOGARITHMIC) {
            decreaseTemperatureLog(startTemperature, iteration);
        }
    }

    public boolean acceptSolution(final long costCurrTimeTable, final long costNextTimeTable) {
        final long deltaCost = costNextTimeTable - costCurrTimeTable;

        if (deltaCost < 0) {
            // next solution is better, always accept
            return true;
        }

        final double probability = Math.exp(-deltaCost / (BOLTZMANN_CONSTANT * getTemperature()));
        return ThreadLocalRandom.current().nextDouble() < probability;
    }

    /**
     * Replaces the wishes the cost function prices, keyed by name symbol, and
     * hands them to the current schedule. Wishes that fail validation are left
     * out and returned as messages, never guessed at - the same rule the
     * importer follows. Setting them recounts the schedule's cost, so call it
     * before a run and not while one is going.
     */
    public List<String> setTeacherWishProfiles(final List<TeacherWishProfile> profiles) {
        final List<String> rejected = new ArrayList<>();
        final WishState state = wishStateOf(profiles, rejected);
        wishState.set(state);
        final Schedule schedule = dataRepository.getSchedule();
        if (schedule != null) {
            rejected.addAll(schedule.setWishes(state));
        }
        return rejected;
    }

    /** Validates the profiles and weighs them against the budget, see setTeacherWishProfiles. */
    public static WishState wishStateOf(final List<TeacherWishProfile> profiles, final List<String> rejected) {
        if (profiles == null) {
            return WishState.EMPTY;
        }
        final Map<String, LoadedWishes> byTeacher = new HashMap<>();
        final Map<String, LinkedPair> links = new LinkedHashMap<>();

        for (final TeacherWishProfile profile : profiles) {
            final String self = profile.nameSymbol();
            final List<TeacherWish> valid = new ArrayList<>();

            for (final TeacherWish wish : profile.wishes()) {
                final List<String> problems = new ArrayList<>(wish.problems());
                if (wish.type() == WishType.LINKED_TEACHER
                        && self.equals(TeacherWishProfile.toNameSymbol(wish.otherTeacherId()))) {
                    problems.add("linked to itself");
                }
                if (problems.isEmpty()) {
                    valid.add(wish);
                } else {
                    rejected.add(profile.teacherId() + " " + wish.type() + ": " + String.join(", ", problems));
                }
            }
            if (valid.isEmpty()) {
                continue;
            }

            long total = 0;
            for (final TeacherWish wish : valid) {
                total += TeacherWishes.fullCostOf(wish.degree());
            }
            final LoadedWishes loaded = new LoadedWishes(
                    new TeacherWishProfile(profile.teacherId(), profile.textHash(), List.copyOf(valid),
                            profile.unmappable()),
                    Math.min(1.0, (double) WISH_BUDGET_PER_TEACHER / total));
            byTeacher.put(self, loaded);

            for (final TeacherWish wish : valid) {
                if (wish.type() != WishType.LINKED_TEACHER) {
                    continue;
                }
                final String other = TeacherWishProfile.toNameSymbol(wish.otherTeacherId());
                final String first = self.compareTo(other) <= 0 ? self : other;
                final String second = first.equals(self) ? other : self;
                links.putIfAbsent(first + "|" + second + "|" + wish.linkMode() + "|" + wish.day(),
                        new LinkedPair(first, second, wish.linkMode(), wish.day(), loaded.unitCost(wish.degree())));
            }
        }

        final Set<String> linkedTeachers = new HashSet<>();
        for (final LinkedPair pair : links.values()) {
            linkedTeachers.add(pair.first());
            linkedTeachers.add(pair.second());
        }
        return new WishState(Map.copyOf(byTeacher), List.copyOf(links.values()), Set.copyOf(linkedTeachers));
    }

    private void logCostBreakdown(final Schedule schedule, final long iteration) {
        final CostBreakdown breakdown = schedule.breakdown();
        lastCostBreakdown.set(breakdown);

        long hard = 0;
        for (final var entry : breakdown.asMap().entrySet()) {
            if (entry.getKey().isHard()) {
                hard += entry.getValue() / CostModel.IMPOSSIBLE_COST;
            }
        }
        System.out.println("iteration " + iteration + " hard violations " + hard + " cost " + breakdown.format());
    }

    /** Where the cost stood at the last logged iteration, split by category. */
    public CostBreakdown getLastCostBreakdown() {
        return lastCostBreakdown.get();
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

    /**
     * T0 at iteration 0, falling with the logarithm of the iteration from there.
     */
    public void decreaseTemperatureLog(double T0, double k) {
        setTemperature(T0 * Math.log(2) / Math.log(k + 2));
    }

    public void setIsRunning(boolean paused) {
        isRunning.set(paused);
    }

    /**
     * The loop stops after its current iteration; it reports "not running" itself
     * when it ends.
     */
    public void pauseAlgorithm() {
        isRunning.set(false);
    }

    /**
     * Starts a fresh run on the current plan and returns when the run ends (pause,
     * stop or Einfach
     * finishing). Does nothing while a run is already going on.
     */
    public void startRun(final RunState.Mode mode) {
        synchronized (this) {
            if (dataRepository.getAlgorithmRunning()) {
                return;
            }
            applyMode(mode);
            // the last run left the temperature cold: a fresh run starts hot
            setTemperature(INITIAL_TEMPERATURE);
            isRunning.set(true);
            dataRepository.setAlgorithmRunning(true);
            dataRepository.getRunState().start(mode);
        }
        algorithmLoop();
    }

    public void resumeAlgorithm() {
        resumeAlgorithm(automaticMode.get() ? RunState.Mode.EINFACH : RunState.Mode.ERWEITERT);
    }

    /**
     * Goes on after a pause, or improves a finished plan further, in a new thread.
     */
    public synchronized void resumeAlgorithm(final RunState.Mode mode) {
        if (dataRepository.getAlgorithmRunning()) {
            return;
        }
        applyMode(mode);
        // Einfach stops at once when the plan is already cold: give it a warm start
        if (mode == RunState.Mode.EINFACH && getTemperature() <= 1) {
            setTemperature(RunState.ROUND_REHEAT);
        }
        dataRepository.getRunState().resume(mode);
        isRunning.set(true);
        dataRepository.setAlgorithmRunning(true);
        new Thread(() -> run(Long.MAX_VALUE, false)).start();
    }

    /** Switches between Einfach (automatic) and Erweitert, also during a run. */
    public void applyMode(final RunState.Mode mode) {
        final boolean automatic = mode == RunState.Mode.EINFACH;
        automaticMode.set(automatic);
        this.dataRepository.setAutomaticMode(automatic);
        dataRepository.getRunState().setMode(mode);
    }

    public RunStatusDTO getRunStatus() {
        return dataRepository.getRunState().snapshot();
    }

    public boolean getAutomaticMode() {
        return automaticMode.get();
    }

    public boolean getIsRunning() {
        return isRunning.get();
    }

    public void toggleAutomaticMode() {
        boolean toggledMode = !automaticMode.get();

        applyMode(toggledMode ? RunState.Mode.EINFACH : RunState.Mode.ERWEITERT);
    }
}
