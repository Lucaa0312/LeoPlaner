package at.htlleonding.leoplaner.dto;

/**
 * The state of the optimisation run as every client sees it: status idle / running / paused /
 * finished, mode einfach / erweitert, the Einfach round, progress 0..1 (never backwards within a
 * run), the minimum seconds left (null when unknown), why it finished (null unless finished) and
 * the best cost of the run (null before the first iteration).
 */
public record RunStatusDTO(String status, String mode, int round, double progress, Double etaSeconds,
        String finishReason, Long bestCost) {
}
