package at.htlleonding.leoplaner.dto;

public record AlgorithmProgressDTO(int iteration, double temperature, int currentCost, boolean finished) {
    public static AlgorithmProgressDTO createAlgorithmProgressDTO(int iteration, double temperature, int currentCost, boolean finished) {
        return new AlgorithmProgressDTO(iteration, temperature, currentCost, finished);
    }
}
