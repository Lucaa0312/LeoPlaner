package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.dto.RunStatusDTO;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.LongSupplier;

/**
 * The lifecycle of an optimisation run, kept on the server so that every page, tab and device sees
 * the same thing: the Einfach rounds, the progress bar, the time left and why the run finished.
 * The algorithm thread reports to it; REST and the WebSocket read snapshots of it.
 *
 * Einfach runs in rounds. One round is one automatic-mode pass of the algorithm: cool to 0.1, heat
 * itself up to about 128, cool to 0.1 again. After that the run warms the plan up to ROUND_REHEAT
 * and starts the next round, until ROUNDS_WITHOUT_GAIN_TO_FINISH rounds in a row brought no gain or
 * the time limit is reached.
 */
public class RunState {
    public enum Status { IDLE, RUNNING, PAUSED, FINISHED }

    public enum Mode { EINFACH, ERWEITERT }

    public enum FinishReason { NO_FURTHER_GAIN, TIME_LIMIT }

    /** warm enough to leave a local optimum, cool enough to keep the plan */
    public static final double ROUND_REHEAT = 8;
    static final int ROUNDS_WITHOUT_GAIN_TO_FINISH = 3;
    static final Duration DEFAULT_TIME_LIMIT = Duration.ofMinutes(15);

    // The temperature falls by a fixed factor per iteration, so the iterations to a temperature
    // are predictable. That is what the time left is counted in.
    private static final double COOL_PER_ITER = -Math.log(SimulatedAnnealingAlgorithm.COOLING_RATE);
    private static final double COLD = 0.1;
    private static final double SELF_REHEAT = 128;
    private static final double MAX_BEFORE_FINISHED = 0.99;

    private final LongSupplier clock;
    private long timeLimitMillis = DEFAULT_TIME_LIMIT.toMillis();

    private Status status = Status.IDLE;
    private Mode mode = Mode.EINFACH;
    private FinishReason finishReason;
    private int round;
    private int roundsWithoutGain;
    private long bestCost = Long.MAX_VALUE;
    private long bestAtRoundStart = Long.MAX_VALUE;
    /** the current round already did its own reheat to about 128 */
    private boolean selfReheated;
    private final List<Long> roundLengths = new ArrayList<>();
    private long roundStartIteration;

    /** iterations since this stretch of the run began, across pause/resume (the loop counter restarts) */
    private long iterations;
    private long lastLoopIteration;
    private double temperature = Double.NaN;

    /** running time of this stretch, without pauses, for the time limit */
    private long runMillis;
    private long runningSince;

    private double progress;
    /** where the bar stood when it was resumed after a pause, and the iteration it went on from */
    private double progressBase;
    private long progressFromIteration;
    private Double etaSeconds;

    /** iterations per second, smoothed */
    private double rate;
    private long rateAt;
    private long rateIteration;

    public RunState() {
        this(System::currentTimeMillis);
    }

    RunState(final LongSupplier clock) {
        this.clock = clock;
    }

    /** "einfach" or "erweitert" as the frontend sends it; anything else is Einfach */
    public static Mode parseMode(final String mode) {
        return "erweitert".equalsIgnoreCase(mode == null ? "" : mode.trim()) ? Mode.ERWEITERT : Mode.EINFACH;
    }

    public void setTimeLimit(final Duration limit) {
        this.timeLimitMillis = limit.toMillis();
    }

    /** back to "no run yet", e.g. after the data or the plan was replaced */
    public synchronized void reset() {
        status = Status.IDLE;
        finishReason = null;
        round = 0;
        roundsWithoutGain = 0;
        bestCost = Long.MAX_VALUE;
        bestAtRoundStart = Long.MAX_VALUE;
        temperature = Double.NaN;
        newStretch();
    }

    /** a fresh run on the current plan */
    public synchronized void start(final Mode mode) {
        reset();
        this.mode = mode;
        status = Status.RUNNING;
        round = 1;
        runningSince = clock.getAsLong();
    }

    /**
     * Goes on after a pause from where the bar stood. Improving a finished plan further is a new
     * stretch: the bar, the rounds and the time limit start again.
     */
    public synchronized void resume(final Mode mode) {
        if (status == Status.RUNNING) {
            return;
        }
        if (status == Status.PAUSED) {
            progressBase = progress;
            progressFromIteration = iterations;
        } else {
            newStretch();
            round = 1;
            roundsWithoutGain = 0;
            bestAtRoundStart = bestCost;
        }
        setModeLocked(mode);
        finishReason = null;
        status = Status.RUNNING;
        runningSince = clock.getAsLong();
    }

    public synchronized void setMode(final Mode mode) {
        setModeLocked(mode);
    }

    private void setModeLocked(final Mode mode) {
        if (mode == Mode.EINFACH && this.mode != Mode.EINFACH) {
            // Einfach counts its rounds from here, and the bar goes on from where it stood
            round = Math.max(round, 1);
            roundsWithoutGain = 0;
            bestAtRoundStart = bestCost;
            roundStartIteration = iterations;
            selfReheated = false;
            progressBase = progress;
            progressFromIteration = iterations;
        }
        this.mode = mode;
    }

    private void newStretch() {
        selfReheated = false;
        roundLengths.clear();
        roundStartIteration = 0;
        iterations = 0;
        lastLoopIteration = 0;
        runMillis = 0;
        progress = 0;
        progressBase = 0;
        progressFromIteration = 0;
        etaSeconds = null;
        rate = 0;
        rateAt = 0;
        rateIteration = 0;
    }

    /** a new algorithm loop begins: its iteration counter starts at 0 again */
    public synchronized void loopStarted() {
        lastLoopIteration = 0;
        rateAt = 0;
    }

    /** the algorithm reports where it is; called a few times per second, not every iteration */
    public synchronized void progress(final long loopIteration, final double temperature, final long loopBest) {
        iterations += Math.max(0, loopIteration - lastLoopIteration);
        lastLoopIteration = loopIteration;
        this.temperature = temperature;
        bestCost = Math.min(bestCost, loopBest);
        measureRate();
        if (status == Status.RUNNING) {
            estimate();
        }
    }

    /** the current round reheated itself; from now on only its last cool-down is left */
    public synchronized void selfReheated() {
        selfReheated = true;
    }

    /**
     * An Einfach round is over. Returns true when the run goes on with another round, false when
     * it is finished (no gain in the last rounds, or the time limit).
     */
    public synchronized boolean roundEnded(final long loopBest) {
        bestCost = Math.min(bestCost, loopBest);
        final boolean gained = bestAtRoundStart == Long.MAX_VALUE
                || bestAtRoundStart - bestCost >= minGain(bestAtRoundStart);
        roundsWithoutGain = gained ? 0 : roundsWithoutGain + 1;

        if (roundsWithoutGain >= ROUNDS_WITHOUT_GAIN_TO_FINISH) {
            finish(FinishReason.NO_FURTHER_GAIN);
            return false;
        }
        if (elapsedMillis() >= timeLimitMillis) {
            finish(FinishReason.TIME_LIMIT);
            return false;
        }
        // the first round starts hot, the others at ROUND_REHEAT: only those predict the next one
        if (round > 1) {
            roundLengths.add(iterations - roundStartIteration);
        }
        roundStartIteration = iterations;
        round++;
        bestAtRoundStart = bestCost;
        selfReheated = false;
        return true;
    }

    /** the algorithm loop ended without finishing: someone paused or stopped it */
    public synchronized void stopped() {
        if (status != Status.RUNNING) {
            return;
        }
        runMillis = elapsedMillis();
        status = Status.PAUSED;
        etaSeconds = null;
    }

    private void finish(final FinishReason reason) {
        runMillis = elapsedMillis();
        status = Status.FINISHED;
        finishReason = reason;
        progress = 1;
        etaSeconds = null;
    }

    private static long minGain(final long bestBefore) {
        return Math.max(2, Math.round(bestBefore * 0.001));
    }

    private long elapsedMillis() {
        return status == Status.RUNNING ? runMillis + clock.getAsLong() - runningSince : runMillis;
    }

    private void measureRate() {
        final long now = clock.getAsLong();
        if (rateAt == 0) {
            rateAt = now;
            rateIteration = iterations;
        } else if (now - rateAt >= 200) {
            final double r = (iterations - rateIteration) * 1000.0 / (now - rateAt);
            if (r > 0) {
                rate = rate > 0 ? rate * 0.7 + r * 0.3 : r;
            }
            rateAt = now;
            rateIteration = iterations;
        }
    }

    private static double itersToCold(final double t) {
        return t > COLD ? Math.log(t / COLD) / COOL_PER_ITER : 0;
    }

    /** one whole automatic-mode loop that starts at temperature t */
    private static double loopIters(final double t) {
        return itersToCold(t) + itersToCold(SELF_REHEAT);
    }

    /**
     * Iterations left, turned into time with the measured speed. In Einfach at least as many more
     * rounds follow as are missing to "no gain ROUNDS_WITHOUT_GAIN_TO_FINISH times in a row"; if a
     * round still brings a gain, one more follows. The time left then goes up, the bar only slows
     * down: it never moves backwards.
     */
    private void estimate() {
        // Erweitert runs until someone stops it: there is no end to count towards. The bar waits
        // where it is and goes on when the run is switched back to Einfach.
        if (!Double.isFinite(temperature) || mode != Mode.EINFACH) {
            etaSeconds = null;
            return;
        }
        double left = selfReheated ? itersToCold(temperature) : loopIters(temperature);
        final int more = Math.max(0, ROUNDS_WITHOUT_GAIN_TO_FINISH - roundsWithoutGain - 1);
        final double perRound = roundLengths.isEmpty()
                ? loopIters(ROUND_REHEAT)
                : roundLengths.stream().mapToLong(Long::longValue).average().orElse(0);
        left += more * perRound;
        final double capMillis = Math.max(0, timeLimitMillis - elapsedMillis());
        final double done = iterations - progressFromIteration;
        double own = done + left > 0 ? done / (done + left) : 0;
        if (timeLimitMillis > 0) {
            own = Math.max(own, 1 - capMillis / timeLimitMillis);
        }
        progress = Math.min(MAX_BEFORE_FINISHED, Math.max(progress, progressBase + (1 - progressBase) * own));
        etaSeconds = rate > 0 ? Math.min(left / rate * 1000, capMillis) / 1000 : null;
    }

    public synchronized Status getStatus() {
        return status;
    }

    public synchronized double getProgress() {
        return progress;
    }

    public synchronized RunStatusDTO snapshot() {
        return new RunStatusDTO(
                status.name().toLowerCase(Locale.ROOT),
                mode.name().toLowerCase(Locale.ROOT),
                round,
                progress,
                etaSeconds,
                finishReason == null ? null : finishReason.name().toLowerCase(Locale.ROOT),
                bestCost == Long.MAX_VALUE ? null : bestCost);
    }
}
