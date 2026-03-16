package at.htlleonding.leoplaner.dto;

public record AlgorithmProgressDTO(long iteration, double temperature, long currentCost, boolean finished) {
    public static AlgorithmProgressDTO createAlgorithmProgressDTO(long iteration, double temperature, long currentCost,
            boolean finished) {
        return new AlgorithmProgressDTO(iteration, temperature, currentCost, finished);
    }
}
