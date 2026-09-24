package at.htlleonding.leoplaner.wishes;

import java.io.File;
import java.io.IOException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import at.htlleonding.leoplaner.data.TimetableExportImporter;

/**
 * Stands in for a model until one is configured: answers with the hand-written
 * entry of teacherWishProfiles.json whose sourceText is the asked text.
 * Anything else gets an empty answer, never a guess.
 */
public class FakeWishClient implements WishExtractionClient {

    public static final String PROFILES_PATH = "src/files/teacherWishProfiles.json";

    private final ObjectMapper mapper = new ObjectMapper();
    private final File file;

    public FakeWishClient() {
        this(new File(PROFILES_PATH));
    }

    public FakeWishClient(final File file) {
        this.file = file;
    }

    @Override
    public String extract(final String systemPrompt, final String wishText) throws IOException {
        final String wanted = TimetableExportImporter.hash(TimetableExportImporter.normalizeWishText(wishText));

        if (file.exists()) {
            for (final JsonNode entry : mapper.readTree(file)) {
                final String text = TimetableExportImporter.normalizeWishText(entry.path("sourceText").asText(null));
                if (text != null && TimetableExportImporter.hash(text).equals(wanted)) {
                    final ObjectNode answer = mapper.createObjectNode();
                    answer.set("wishes", entry.path("wishes"));
                    answer.set("unmappable", entry.path("unmappable"));
                    return mapper.writeValueAsString(answer);
                }
            }
        }
        return "{\"wishes\":[],\"unmappable\":[]}";
    }

    @Override
    public String modelId() {
        return "fake";
    }
}
