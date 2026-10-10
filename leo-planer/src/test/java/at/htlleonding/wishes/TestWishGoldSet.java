package at.htlleonding.wishes;

import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.wishes.OpenAiCompatibleWishClient;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.Snapshot;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.TeacherRef;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.WishInput;
import at.htlleonding.leoplaner.wishes.WishResources;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Measures a real model against the hand-labelled texts of wishes/gold.json,
 * so a change to the prompt, the schema or the model is a number and not an
 * impression. Prints a report and asserts nothing; it only runs when a model
 * is named:
 *
 * ./mvnw test -Dtest=TestWishGoldSet -Dwishes.gold.model=qwen3-wish
 *
 * wishes.gold.base-url defaults to a local Ollama, wishes.gold.retry-reasoning-effort
 * to "none". Needs no database.
 */
@EnabledIfSystemProperty(named = "wishes.gold.model", matches = ".+")
public class TestWishGoldSet {

    private static final String TEXTS_PATH = "src/files/teacherWishes.json";
    private static final List<String> EXACT_FIELDS = List.of(
            "hour", "count", "day", "className", "linkMode", "doublePeriodMode", "candidates");

    @TempDir
    Path dir;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    public void measure() throws IOException {
        final JsonNode gold = mapper.readTree(getClass().getClassLoader().getResource("wishes/gold.json"));

        final Map<String, String> texts = new HashMap<>();
        for (final JsonNode wish : mapper.readTree(new File(TEXTS_PATH)).path("wishes")) {
            texts.put(wish.path("teacherId").asText(), wish.path("sourceText").asText());
        }

        final List<WishInput> inputs = new ArrayList<>();
        for (final JsonNode text : gold.path("texts")) {
            final String teacherId = text.path("teacherId").asText();
            inputs.add(new WishInput(TeacherWishProfile.toNameSymbol(teacherId), texts.get(teacherId)));
        }
        final List<TeacherRef> teachers = new ArrayList<>();
        for (final JsonNode teacher : gold.path("teachers")) {
            teachers.add(new TeacherRef(teacher.path("nameSymbol").asText(), teacher.path("teacherName").asText()));
        }
        final List<String> classNames = new ArrayList<>();
        gold.path("classNames").forEach(c -> classNames.add(c.asText()));

        final OpenAiCompatibleWishClient client = new OpenAiCompatibleWishClient(
                System.getProperty("wishes.gold.base-url", "http://localhost:11434/v1"),
                System.getProperty("wishes.gold.model"), System.getProperty("wishes.gold.api-key"),
                WishResources.schema(), true, Integer.getInteger("wishes.gold.max-tokens", 4096),
                System.getProperty("wishes.gold.retry-reasoning-effort", "none"));

        final long start = System.currentTimeMillis();
        final List<TeacherWishProfile> profiles = new TeacherWishExtractor(client, dir.resolve("cache.json"))
                .extract(new Snapshot(inputs, teachers, List.of(), classNames));
        final long seconds = (System.currentTimeMillis() - start) / 1000;

        int expectedTotal = 0;
        int found = 0;
        int degreeChecked = 0;
        int degreeRight = 0;
        int extra = 0;
        int unanswered = 0;
        final StringBuilder report = new StringBuilder();

        for (final JsonNode text : gold.path("texts")) {
            final String teacherId = text.path("teacherId").asText();
            final TeacherWishProfile profile = profiles.stream()
                    .filter(p -> teacherId.equals(p.teacherId())).findFirst().orElseThrow();
            final List<JsonNode> produced = new ArrayList<>();
            for (final TeacherWish wish : profile.wishes()) {
                produced.add(mapper.valueToTree(wish));
            }
            // an answer that never parsed leaves the whole text as the only unmappable entry
            final String whole = TimetableExportImporter.normalizeWishText(texts.get(teacherId));
            if (profile.wishes().isEmpty() && profile.unmappable().equals(List.of(whole))) {
                unanswered++;
                report.append("  NO ANSWER ").append(teacherId).append('\n');
            }

            for (final JsonNode expected : text.path("expected")) {
                expectedTotal++;
                final JsonNode match = produced.stream()
                        .filter(p -> matches(expected, p) || (expected.has("or") && matches(expected.get("or"), p)))
                        .findFirst().orElse(null);
                if (match == null) {
                    report.append("  MISSING ").append(teacherId).append(' ').append(expected).append('\n');
                    continue;
                }
                produced.remove(match);
                found++;
                if (expected.has("degrees")) {
                    degreeChecked++;
                    boolean right = false;
                    for (final JsonNode degree : expected.path("degrees")) {
                        right |= degree.asText().equals(match.path("degree").asText());
                    }
                    if (right) {
                        degreeRight++;
                    } else {
                        report.append("  DEGREE  ").append(teacherId).append(' ').append(expected.path("type").asText())
                                .append(" is ").append(match.path("degree").asText()).append(", expected ")
                                .append(expected.path("degrees")).append('\n');
                    }
                }
            }
            for (final JsonNode left : produced) {
                extra++;
                report.append("  EXTRA   ").append(teacherId).append(' ').append(brief(left)).append('\n');
            }
        }

        System.out.println("Wish gold set, " + client.modelId() + ", " + seconds + " s");
        System.out.print(report);
        System.out.println("  wishes found " + found + "/" + expectedTotal + ", degree right " + degreeRight + "/"
                + degreeChecked + ", extra " + extra + ", texts without an answer " + unanswered + "/"
                + gold.path("texts").size());
    }

    private static boolean matches(final JsonNode expected, final JsonNode produced) {
        if (!expected.path("type").equals(produced.path("type"))) {
            return false;
        }
        for (final String field : EXACT_FIELDS) {
            if (expected.has(field) && !expected.get(field).equals(produced.path(field))) {
                return false;
            }
        }
        return !expected.has("firstCandidate")
                || expected.get("firstCandidate").equals(produced.path("candidates").path(0));
    }

    private static String brief(final JsonNode wish) {
        final StringBuilder sb = new StringBuilder();
        wish.fields().forEachRemaining(f -> {
            if (!f.getValue().isNull() && !"sourceSnippet".equals(f.getKey())
                    && !(f.getValue().isArray() && f.getValue().isEmpty())) {
                sb.append(f.getKey()).append('=').append(f.getValue()).append(' ');
            }
        });
        return sb.toString().trim();
    }
}
