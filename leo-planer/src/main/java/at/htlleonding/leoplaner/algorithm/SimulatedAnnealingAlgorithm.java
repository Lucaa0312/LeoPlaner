package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.Random;
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

    private final AtomicReference<CostBreakdown> lastCostBreakdown = new AtomicReference<>();

    private final AtomicBoolean isRunning = new AtomicBoolean(true);
    private final AtomicBoolean automaticMode = new AtomicBoolean(false);

    private final CoolingMode initCoolingMode = CoolingMode.GEOMETRIC;
    private AtomicReference<CoolingMode> coolingMode = new AtomicReference<>(initCoolingMode);

    /**
     * Soft costs move by roughly 3 to 100 per step, so at 100 a bad move is
     * still taken fairly often. Starting at 1000 spent the first third of the
     * run accepting practically everything - a random walk, not a search.
     */
    private static final double INITIAL_TEMPERATURE = 100;
    private static AtomicLong temperature = new AtomicLong(Double.doubleToLongBits(INITIAL_TEMPERATURE));

    /**
     * About a million iterations from INITIAL_TEMPERATURE down to 0.1. A move
     * only re-costs what it touches, so that is around ten seconds for the
     * whole school, which is what its 1600 blocks need to reach zero hard
     * violations reliably.
     */
    private final double COOLING_RATE = 0.999993;
    public static final double BOLTZMANN_CONSTANT = 1;

    public record History(long iteration, double temperature, long cost) {
    }

    public void algorithmLoop() {
        algorithmLoop(Long.MAX_VALUE);
    }

    public void algorithmLoop(final Long iterationCap) {
        final Schedule schedule = dataRepository.getSchedule();
        if (schedule == null || schedule.getBlocks().isEmpty()) {
            progressEvent.fire(new AlgorithmProgressDTO(0, getTemperature(), 0, true));
            return;
        }

        this.dataRepository.setAlgorithmRunning(true);
        this.dataRepository.setAlgorithmRunningAtLeastOnce(true);
        long iterationCounter = 0;
        long bestCosts = Long.MAX_VALUE;
        long lastBestCost = bestCosts;
        int hitBestCostCounter = 0;

        long currentCost = schedule.getTotalCost();
        long lastCost = currentCost;
        long sameCostStreak = 0;
        long lastProgressNanos = 0;
        long lastPublishNanos = System.nanoTime();

        final Random random = ThreadLocalRandom.current();
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

            sameCostStreak = currentCost == lastCost ? sameCostStreak + 1 : 1;
            lastCost = currentCost;

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
                progressEvent.fire(new AlgorithmProgressDTO(iterationCounter, getTemperature(), currentCost, false));
                lastProgressNanos = now;
            }
            if (now - lastPublishNanos >= PUBLISH_INTERVAL_NANOS) {
                this.dataRepository.getTimetableService().publish();
                lastPublishNanos = now;
            }

            coolTempertaure(iterationCounter);

            if (automaticMode.get() && getTemperature() < 0.1) {
                lastBestCost = bestCosts;
                hitBestCostCounter++;

                if (hitBestCostCounter >= 2) {
                    pauseAlgorithm();
                }
                pushTemperature(autumaticallyPushTemperatureAmount(sameCostStreak));
            }

            iterationCounter++;
        }

        this.dataRepository.getTimetableService().publish();
        logCostBreakdown(schedule, iterationCounter);
        this.dataRepository.setAlgorithmRunning(false);
        progressEvent.fire(new AlgorithmProgressDTO(iterationCounter, getTemperature(), currentCost, true));
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

    private void coolTempertaure(long iteration) {
        if (coolingMode.get() == CoolingMode.GEOMETRIC) {
            decreaseTemperature();
        } else if (coolingMode.get() == CoolingMode.LOGARITHMIC) {
            decreaseTemperatureLog(INITIAL_TEMPERATURE, iteration);
        }
    }

    /**
     * How far to reheat after sameCostStreak iterations in a row ended on the
     * same cost.
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

    public boolean acceptSolution(final long costCurrTimeTable, final long costNextTimeTable) {
        final long deltaCost = costNextTimeTable - costCurrTimeTable;

        if (deltaCost < 0) {
            // next solution is better, always accept
            return true;
        }

        final double probability = Math.exp(-deltaCost / (BOLTZMANN_CONSTANT * getTemperature()));
        return ThreadLocalRandom.current().nextDouble() < probability;
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

    public void pushTemperature(final double pushAmount) {
        final double current = getTemperature();
        setTemperature(current + pushAmount);
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
