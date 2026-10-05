package at.htlleonding.leoplaner.dto;

/** One progress message of the algorithm; run is the run state at that moment (same as GET algorithm/status). */
public record AlgorithmProgressDTO(long iteration, double temperature, long currentCost, boolean finished,
        RunStatusDTO run) {
    public static AlgorithmProgressDTO createAlgorithmProgressDTO(long iteration, double temperature, long currentCost,
            boolean finished) {
        return new AlgorithmProgressDTO(iteration, temperature, currentCost, finished, null);
    }
}
