package at.htlleonding.leoplaner.algorithm;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import at.htlleonding.leoplaner.dto.RunStatusDTO;

public class RunStateTest {
    private long now;
    private RunState run;

    @BeforeEach
    public void newRun() {
        now = 1_000_000;
        run = new RunState(() -> now);
    }

    /** one Einfach round as the algorithm reports it: cool down, reheat itself, cool down again */
    private void playRound(final long iterations, final double startTemperature, final long best) {
        run.loopStarted();
        final int steps = 20;
        for (int i = 0; i <= steps; i++) {
            final double t = i == steps / 2 ? 128 : startTemperature * Math.pow(0.5, i);
            if (i == steps / 2) {
                run.selfReheated();
            }
            now += 300;
            run.progress(iterations * i / steps, t, best);
        }
    }

    @Test
    public void newRunIsIdle() {
        final RunStatusDTO s = run.snapshot();
        assertEquals("idle", s.status());
        assertEquals(0, s.progress());
        assertNull(s.finishReason());
    }

    @Test
    public void finishesAfterThreeRoundsWithoutGain() {
        run.start(RunState.Mode.EINFACH);
        playRound(1_000_000, 100, 500);
        assertTrue(run.roundEnded(500), "the first round always counts as a gain");
        for (int i = 0; i < 2; i++) {
            playRound(1_000_000, RunState.ROUND_REHEAT, 500);
            assertTrue(run.roundEnded(500));
        }
        playRound(1_000_000, RunState.ROUND_REHEAT, 500);
        assertFalse(run.roundEnded(500));

        final RunStatusDTO s = run.snapshot();
        assertEquals("finished", s.status());
        assertEquals("no_further_gain", s.finishReason());
        assertEquals(4, s.round());
        assertEquals(1, s.progress());
    }

    @Test
    public void aGainStartsTheCountAgain() {
        run.start(RunState.Mode.EINFACH);
        playRound(1_000_000, 100, 500);
        run.roundEnded(500);
        playRound(1_000_000, RunState.ROUND_REHEAT, 500);
        run.roundEnded(500);
        playRound(1_000_000, RunState.ROUND_REHEAT, 400);
        assertTrue(run.roundEnded(400), "a gain resets the rounds without gain");
        assertEquals("running", run.snapshot().status());
    }

    @Test
    public void finishesAtTheTimeLimit() {
        run.setTimeLimit(Duration.ofSeconds(10));
        run.start(RunState.Mode.EINFACH);
        playRound(1_000_000, 100, 500);
        now += 10_000;
        assertFalse(run.roundEnded(400));
        assertEquals("time_limit", run.snapshot().finishReason());
        assertEquals("finished", run.snapshot().status());
    }

    @Test
    public void userPauseIsNotFinished() {
        run.start(RunState.Mode.EINFACH);
        playRound(500_000, 100, 500);
        run.stopped();

        final RunStatusDTO s = run.snapshot();
        assertEquals("paused", s.status());
        assertNull(s.finishReason());
        assertTrue(s.progress() > 0 && s.progress() < 1);
    }

    @Test
    public void resumeAfterPauseGoesOnFromThere() {
        run.start(RunState.Mode.EINFACH);
        playRound(500_000, 100, 500);
        run.stopped();
        final double paused = run.getProgress();

        now += 60_000;
        run.resume(RunState.Mode.EINFACH);
        run.loopStarted();
        now += 300;
        run.progress(10, 8, 500);
        assertEquals("running", run.snapshot().status());
        assertTrue(run.getProgress() >= paused);
    }

    @Test
    public void resumeAfterFinishedIsANewStretch() {
        run.setTimeLimit(Duration.ZERO);
        run.start(RunState.Mode.EINFACH);
        playRound(1_000_000, 100, 500);
        assertFalse(run.roundEnded(500));

        run.setTimeLimit(Duration.ofMinutes(15));
        run.resume(RunState.Mode.EINFACH);
        final RunStatusDTO s = run.snapshot();
        assertEquals("running", s.status());
        assertEquals(0, s.progress());
        assertEquals(1, s.round());
        assertNull(s.finishReason());
    }

    @Test
    public void progressNeverMovesBackwards() {
        run.start(RunState.Mode.EINFACH);
        final List<Double> seen = new ArrayList<>();
        final long[] bests = { 900, 800, 790, 700, 700, 700, 700 };
        boolean goesOn = true;
        for (int r = 0; goesOn; r++) {
            run.loopStarted();
            final int steps = 50;
            for (int i = 0; i <= steps; i++) {
                final double t = i == steps / 2 ? 128 : (r == 0 ? 100 : RunState.ROUND_REHEAT) * Math.pow(0.8, i);
                if (i == steps / 2) {
                    run.selfReheated();
                }
                now += 250;
                // the rounds get longer and shorter: the estimate changes, the bar must not go back
                run.progress((long) (i * (20_000 + r * 7_000)), t, bests[Math.min(r, bests.length - 1)]);
                seen.add(run.getProgress());
            }
            goesOn = run.roundEnded(bests[Math.min(r, bests.length - 1)]);
            seen.add(run.getProgress());
            if (r == 1) {
                // a pause in the middle of the run
                run.stopped();
                seen.add(run.getProgress());
                now += 5_000;
                run.resume(RunState.Mode.EINFACH);
            }
        }
        for (int i = 1; i < seen.size(); i++) {
            assertTrue(seen.get(i) >= seen.get(i - 1), "progress went back at step " + i + ": " + seen);
        }
        assertEquals(1, seen.get(seen.size() - 1));
        assertEquals("finished", run.snapshot().status());
    }

    @Test
    public void erweitertDoesNotFillTheBar() {
        run.start(RunState.Mode.EINFACH);
        playRound(200_000, 100, 500);
        final double einfach = run.getProgress();

        run.setMode(RunState.Mode.ERWEITERT);
        run.loopStarted();
        for (int i = 1; i <= 40; i++) {
            now += 300;
            // Erweitert cools far below 0.1 and never ends by itself
            run.progress(i * 50_000L, 100 * Math.pow(0.5, i), 500);
        }
        assertEquals(einfach, run.getProgress(), "the bar waits while in Erweitert");
        assertNull(run.snapshot().etaSeconds());
    }

    @Test
    public void backToEinfachGoesOnFromTheBar() {
        run.start(RunState.Mode.EINFACH);
        playRound(200_000, 100, 500);
        run.setMode(RunState.Mode.ERWEITERT);
        run.loopStarted();
        now += 300;
        run.progress(2_000_000, 0.001, 500);
        final double before = run.getProgress();

        run.setMode(RunState.Mode.EINFACH);
        now += 300;
        run.progress(2_050_000, 0.001, 500);
        assertTrue(run.getProgress() >= before);
        assertTrue(run.getProgress() < 0.9, "not stuck near 99 % with rounds still ahead: " + run.getProgress());
        assertNotNull(run.snapshot().etaSeconds());

        // and the run still finishes
        boolean goesOn = true;
        for (int r = 0; r < 10 && goesOn; r++) {
            playRound(500_000, RunState.ROUND_REHEAT, 500);
            goesOn = run.roundEnded(500);
        }
        assertEquals("finished", run.snapshot().status());
    }

    @Test
    public void resetGoesBackToIdle() {
        run.start(RunState.Mode.ERWEITERT);
        playRound(100_000, 100, 500);
        run.reset();
        final RunStatusDTO s = run.snapshot();
        assertEquals("idle", s.status());
        assertEquals(0, s.progress());
        assertNull(s.bestCost());
    }

    @Test
    public void parsesTheModeTheFrontendSends() {
        assertEquals(RunState.Mode.ERWEITERT, RunState.parseMode("erweitert"));
        assertEquals(RunState.Mode.EINFACH, RunState.parseMode("einfach"));
        assertEquals(RunState.Mode.EINFACH, RunState.parseMode(null));
    }
}
