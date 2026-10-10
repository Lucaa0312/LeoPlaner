package at.htlleonding.leoplaner.wishes;

import java.io.IOException;

/**
 * Whatever model reads the wish texts. Kept to a single call so a local model
 * can replace a hosted one without touching the extractor.
 */
public interface WishExtractionClient {

    /** Returns the model's answer as raw JSON, unparsed and unvalidated. */
    String extract(String systemPrompt, String wishText) throws IOException, InterruptedException;

    /** The same question for a second try; a thinking model answers without thinking here. */
    default String extractPlain(final String systemPrompt, final String wishText)
            throws IOException, InterruptedException {
        return extract(systemPrompt, wishText);
    }

    /** Part of the cache key: a different model has to read every text again. */
    String modelId();
}
