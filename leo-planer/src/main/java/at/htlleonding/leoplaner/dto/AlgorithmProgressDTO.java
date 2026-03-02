package at.htlleonding.leoplaner.dto;

public record AlgorithmProgressDTO(double temperature, int currentCost, boolean finished) {
    public static AlgorithmProgressDTO createAlgorithmProgressDTO(double temperature, int currentCost, boolean finished) {
        return new AlgorithmProgressDTO(temperature, currentCost, finished);
    }
}
