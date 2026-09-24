package at.htlleonding.leoplaner.wishes;

import java.util.Optional;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

/** The configured model, or the fake while base-url or model is missing. */
@ApplicationScoped
public class WishClientProducer {

    @ConfigProperty(name = "leoplaner.wishes.base-url")
    Optional<String> baseUrl;

    @ConfigProperty(name = "leoplaner.wishes.model")
    Optional<String> model;

    @ConfigProperty(name = "leoplaner.wishes.api-key")
    Optional<String> apiKey;

    @ConfigProperty(name = "leoplaner.wishes.structured-output", defaultValue = "true")
    boolean structuredOutput;

    @Produces
    @ApplicationScoped
    WishExtractionClient client() {
        if (baseUrl.isEmpty() || model.isEmpty()) {
            System.out.println("No wish model configured, using " + FakeWishClient.PROFILES_PATH);
            return new FakeWishClient();
        }
        return new OpenAiCompatibleWishClient(baseUrl.get(), model.get(), apiKey.orElse(null),
                WishResources.schema(), structuredOutput);
    }
}
