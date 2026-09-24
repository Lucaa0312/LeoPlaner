package at.htlleonding.leoplaner.wishes;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import at.htlleonding.leoplaner.data.TimetableExportImporter;

/** System prompt and answer schema, kept as files so they can be tuned without touching code. */
public final class WishResources {

    private static final String PROMPT = "wishes/system-prompt.txt";
    private static final String SCHEMA = "wishes/wish-schema.json";

    private WishResources() {
    }

    public static String systemPrompt() {
        return read(PROMPT);
    }

    public static JsonNode schema() {
        try {
            return new ObjectMapper().readTree(read(SCHEMA));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Part of the cache key: an edited prompt or schema has to read every text again. */
    public static String version() {
        return TimetableExportImporter.hash(read(PROMPT) + "\n" + read(SCHEMA));
    }

    private static String read(final String name) {
        try (InputStream in = WishResources.class.getClassLoader().getResourceAsStream(name)) {
            if (in == null) {
                throw new IllegalStateException("missing resource " + name);
            }
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
