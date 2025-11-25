package at.htlleonding.leoplaner.data;

import jakarta.persistence.Embeddable;

@Embeddable
public record RgbColor(int red, int green, int blue) {
    public RgbColor {
        if (red < 0 || red > 255) throw new IllegalArgumentException("Red has to be between 0 and 255.");
        if (green < 0 || green > 255) throw new IllegalArgumentException("Green has to be between 0 and 255.");
        if (blue < 0 || blue > 255) throw new IllegalArgumentException("Blue has to be between 0 and 255.");
    }
}
