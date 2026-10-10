package at.htlleonding.wishes;

import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishDegree;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.wishes.FakeWishClient;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.RoomRef;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.Snapshot;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.TeacherRef;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor.WishInput;
import at.htlleonding.leoplaner.wishes.WishExtractionClient;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class TestTeacherWishExtractor {

    private static final String TEXT = "Freitag frei, sonst Montag.\nGleiche Tage wie Frau Huber.\nBitte in Raum 101.";
    private static final String OTHER_TEXT = "Unbedingt keine Nachmittage.";

    private static final String PROFILES = """
            [
              {
                "teacherId": "TR_AB",
                "sourceText": "Freitag frei, sonst Montag.\\nGleiche Tage wie Frau Huber.\\nBitte in Raum 101.",
                "wishes": [
                  { "type": "FREE_DAY", "degree": "MID", "candidates": ["FRIDAY", "MONDAY"],
                    "sourceSnippet": "Freitag frei, sonst Montag." },
                  { "type": "LINKED_TEACHER", "degree": "LOW", "otherTeacherName": "Frau Huber",
                    "linkMode": "SAME_DAYS", "otherTeacherId": "TR_MADEUP",
                    "sourceSnippet": "Gleiche Tage wie Frau Huber." },
                  { "type": "ROOM", "degree": "LOW", "className": "3AHIF", "roomName": "Raum 101",
                    "sourceSnippet": "Bitte in Raum 101." }
                ],
                "unmappable": []
              },
              {
                "teacherId": "TR_CD",
                "sourceText": "Unbedingt keine Nachmittage.",
                "wishes": [
                  { "type": "FREE_AFTERNOON", "degree": "HIGH", "sourceSnippet": "Unbedingt keine Nachmittage." }
                ],
                "unmappable": []
              }
            ]
            """;

    private static final List<TeacherRef> TEACHERS = List.of(
            new TeacherRef("AB", "Anna Berger"),
            new TeacherRef("HU", "Maria Huber"),
            new TeacherRef("CD", "Chris Dorn"),
            new TeacherRef("MB", "Maria Bauer"));

    private static final List<RoomRef> ROOMS = List.of(
            new RoomRef(7L, (short) 101, "EDUARD", "EDU"),
            new RoomRef(8L, (short) 202, "CHIN", "CH"));

    private static final List<String> CLASSES = List.of("3AHIF", "5BHITM");

    @TempDir
    Path dir;

    private Path cache;
    private CountingClient client;

    @BeforeEach
    void setUp() throws IOException {
        final Path profiles = dir.resolve("profiles.json");
        Files.writeString(profiles, PROFILES, StandardCharsets.UTF_8);
        cache = dir.resolve("cache.json");
        client = new CountingClient(new FakeWishClient(profiles.toFile()));
    }

    private static Snapshot snapshot(final WishInput... inputs) {
        return new Snapshot(List.of(inputs), TEACHERS, ROOMS, CLASSES);
    }

    @Test
    public void fakeAnswerBecomesResolvedProfile() {
        final TeacherWishExtractor extractor = new TeacherWishExtractor(client, cache);

        // the export writes CRLF, the hash is taken of the normalized text
        final List<TeacherWishProfile> profiles = extractor.extract(
                snapshot(new WishInput("AB", "  " + TEXT.replace("\n", "\r\n") + "\n")));

        assertEquals(1, profiles.size());
        final TeacherWishProfile profile = profiles.getFirst();
        assertEquals("TR_AB", profile.teacherId());
        assertEquals("AB", profile.nameSymbol());
        assertEquals(TimetableExportImporter.hash(TEXT), profile.textHash());
        assertEquals(List.of(), profile.unmappable());
        assertEquals(3, profile.wishes().size());

        final TeacherWish freeDay = profile.wishes().get(0);
        assertEquals(WishType.FREE_DAY, freeDay.type());
        assertEquals(List.of(SchoolDays.FRIDAY, SchoolDays.MONDAY), freeDay.candidates());

        // resolved locally, the id the answer brought along is dropped
        final TeacherWish linked = profile.wishes().get(1);
        assertEquals("TR_HU", linked.otherTeacherId());
        assertEquals("Frau Huber", linked.otherTeacherName());

        assertEquals(7L, profile.wishes().get(2).roomId());
    }

    @Test
    public void secondRunIsAnsweredFromTheCache() {
        new TeacherWishExtractor(client, cache).extract(snapshot(new WishInput("AB", TEXT)));
        assertEquals(1, client.calls);
        assertTrue(Files.exists(cache));

        // a new extractor, so only the file can remember
        final List<TeacherWishProfile> again = new TeacherWishExtractor(client, cache)
                .extract(snapshot(new WishInput("AB", TEXT)));

        assertEquals(1, client.calls);
        assertEquals(3, again.getFirst().wishes().size());
    }

    @Test
    public void changedTextAsksTheModelAgain() {
        final TeacherWishExtractor extractor = new TeacherWishExtractor(client, cache);
        extractor.extract(snapshot(new WishInput("CD", OTHER_TEXT)));
        extractor.extract(snapshot(new WishInput("CD", OTHER_TEXT + " Danke!")));

        assertEquals(2, client.calls);
    }

    @Test
    public void unknownTextGivesAnEmptyProfile() {
        final List<TeacherWishProfile> profiles = new TeacherWishExtractor(client, cache)
                .extract(snapshot(new WishInput("CD", "Kein Eintrag in der Datei.")));

        assertEquals(List.of(), profiles.getFirst().wishes());
        assertEquals(List.of(), profiles.getFirst().unmappable());
    }

    @Test
    public void afternoonWithoutATimeStartsWithHourSeven() {
        final TeacherWishProfile profile = new TeacherWishExtractor(client, cache)
                .extract(snapshot(new WishInput("CD", OTHER_TEXT))).getFirst();

        assertEquals(List.of(), profile.unmappable());
        assertEquals(7, profile.wishes().getFirst().hour());
    }

    @Test
    public void invalidWishGoesToUnmappable() {
        // MAX_CONSECUTIVE without a count fails problems()
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [{"type": "MAX_CONSECUTIVE", "degree": "MID", "sourceSnippet": "nicht zu lang"}]}
                """));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("CD", "nicht zu lang"))).getFirst();

        assertEquals(List.of(), profile.wishes());
        assertEquals(1, profile.unmappable().size());
        assertTrue(profile.unmappable().getFirst().contains("count missing"));
    }

    @Test
    public void hourAndDegreeComeFromWhatTheModelQuotes() {
        final String text = "Es ist mir sehr wichtig, dass ich nach der 7. Einheit keine Stunden habe. "
                + "Wenn möglich Montag erst ab 10 Uhr.";
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "LATEST_END", "strengthWords": ["sehr wichtig"], "essential": false,
                   "hourMention": "7. Einheit", "hourMeaning": "LAST_HOUR_TAUGHT",
                   "sourceSnippet": "nach der 7. Einheit keine Stunden"},
                  {"type": "EARLIEST_START", "strengthWords": ["Wenn möglich"], "essential": false,
                   "hourMention": "10 Uhr", "hourMeaning": "FIRST_HOUR_TAUGHT", "day": "MONDAY",
                   "sourceSnippet": "Wenn möglich Montag erst ab 10 Uhr."}
                ], "unmappable": []}
                """));

        final List<TeacherWish> wishes = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB", text))).getFirst().wishes();

        assertEquals(7, wishes.get(0).hour());
        assertEquals(WishDegree.HIGH, wishes.get(0).degree());
        assertEquals(3, wishes.get(1).hour());
        assertEquals(WishDegree.LOW, wishes.get(1).degree());
    }

    @Test
    public void hourThatIsNotInTheTextGoesToUnmappable() {
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "LATEST_END", "strengthWords": [], "essential": false,
                   "hourMention": "7. Einheit", "hourMeaning": "LAST_HOUR_TAUGHT",
                   "sourceSnippet": "Bitte möglichst frühe Stunden"}
                ], "unmappable": []}
                """));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB", "Bitte möglichst frühe Stunden."))).getFirst();

        assertEquals(List.of(), profile.wishes());
        assertTrue(profile.unmappable().getFirst().contains("hour missing"));
    }

    @Test
    public void classIsSpelledAsStoredAndASubjectIsNoClass() {
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "DOUBLE_PERIOD", "degree": "MID", "className": "5b HITM",
                   "doublePeriodMode": "PREFER", "sourceSnippet": "5b HITM geblockt"},
                  {"type": "DOUBLE_PERIOD", "degree": "MID", "className": "MINF",
                   "doublePeriodMode": "PREFER", "sourceSnippet": "MINF geblockt"}
                ], "unmappable": []}
                """));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB", "egal"))).getFirst();

        assertEquals(1, profile.wishes().size());
        assertEquals("5BHITM", profile.wishes().getFirst().className());
        assertTrue(profile.unmappable().getFirst().contains("no class 'MINF'"));
    }

    @Test
    public void severalDaysBecomeOneWishEachAndRepeatsCountOnce() {
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "LATEST_END", "degree": "MID", "hour": 6, "day": "MONDAY",
                   "candidates": ["MONDAY", "TUESDAY"], "sourceSnippet": "Mo, Di bis zur 6."},
                  {"type": "LATEST_END", "degree": "MID", "hour": 6, "day": "TUESDAY",
                   "sourceSnippet": "Di bis zur 6."},
                  {"type": "FREE_DAY", "degree": "MID", "day": "FRIDAY", "sourceSnippet": "Freitag frei"}
                ], "unmappable": []}
                """));

        final List<TeacherWish> wishes = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB", "Mo, Di bis zur 6., Freitag frei"))).getFirst().wishes();

        assertEquals(3, wishes.size());
        assertEquals(SchoolDays.MONDAY, wishes.get(0).day());
        assertNull(wishes.get(0).candidates());
        assertEquals(SchoolDays.TUESDAY, wishes.get(1).day());
        assertNull(wishes.get(2).day());
        assertEquals(List.of(SchoolDays.FRIDAY), wishes.get(2).candidates());
    }

    @Test
    public void dayTheTextDoesNotNameIsNotUsed() {
        // an answer held to English day names turns Mittwoch into MONDAY
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "FREE_DAY", "degree": "LOW", "day": "MONDAY", "candidates": ["MONDAY"],
                   "sourceSnippet": "den ganzen Mittwoch frei"},
                  {"type": "FREE_DAY", "degree": "MID", "count": 2,
                   "candidates": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
                   "sourceSnippet": "Do und Fr wieder frei"},
                  {"type": "FREE_DAY", "degree": "LOW",
                   "candidates": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
                   "sourceSnippet": "ein freier Tag, egal welcher"}
                ], "unmappable": []}
                """));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB",
                        "Bitte den ganzen Mittwoch frei. Do und Fr wieder frei. Sonst ein freier Tag, egal welcher.")))
                .getFirst();

        assertEquals(2, profile.wishes().size());
        assertEquals(List.of(SchoolDays.THURSDAY, SchoolDays.FRIDAY), profile.wishes().get(0).candidates());
        assertEquals(List.of(), profile.wishes().get(1).candidates());
        assertTrue(profile.unmappable().getFirst().contains("day not in the text"));
    }

    @Test
    public void wishWithoutEffectGoesToUnmappable() {
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "EARLIEST_START", "strengthWords": ["gerne"], "essential": false,
                   "hourMention": "08:00", "hourMeaning": "FIRST_HOUR_TAUGHT",
                   "sourceSnippet": "möchte aber gerne immer um 08:00 beginnen"},
                  {"type": "FREE_AFTERNOON", "strengthWords": [], "essential": false, "count": 2,
                   "candidates": ["WEDNESDAY"], "sourceSnippet": "Bitte max. 2 Nachmittage"}
                ], "unmappable": []}
                """));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB",
                        "Ich möchte aber gerne immer um 08:00 beginnen. Bitte max. 2 Nachmittage (Mittwoch viele Std.).")))
                .getFirst();

        assertTrue(profile.unmappable().getFirst().contains("has no effect"));
        // at most two afternoons taught leaves three free, whichever they are
        assertEquals(1, profile.wishes().size());
        assertEquals(3, profile.wishes().getFirst().count());
        assertEquals(List.of(), profile.wishes().getFirst().candidates());
    }

    @Test
    public void reviewedAnswerOutlivesModelAndPrompt() throws IOException {
        final String hash = TimetableExportImporter.hash("keine Lücken");
        Files.writeString(cache, """
                {"%s": {"model": "an older model", "promptVersion": "an older prompt", "reviewed": true,
                  "answer": {"wishes": [{"type": "NO_GAPS", "degree": "HIGH", "sourceSnippet": "keine Lücken"}],
                             "unmappable": []}}}
                """.formatted(hash), StandardCharsets.UTF_8);
        final FixedClient answer = new FixedClient(List.of());
        final TeacherWishExtractor extractor = new TeacherWishExtractor(answer, cache);

        final TeacherWishProfile profile = extractor.extract(snapshot(new WishInput("AB", "keine Lücken")))
                .getFirst();

        assertEquals(0, answer.calls);
        assertEquals(WishDegree.HIGH, profile.wishes().getFirst().degree());
        assertTrue(extractor.review(snapshot(new WishInput("AB", "keine Lücken"))).getFirst().reviewed());
    }

    @Test
    public void ambiguousTeacherAndUnknownRoomGoToUnmappable() {
        final WishExtractionClient answer = new FixedClient(List.of("""
                {"wishes": [
                  {"type": "LINKED_TEACHER", "degree": "LOW", "otherTeacherName": "Maria",
                   "linkMode": "SAME_DAYS", "sourceSnippet": "wie Maria"},
                  {"type": "ROOM", "degree": "LOW", "className": "3AHIF", "roomName": "Turnsaal",
                   "sourceSnippet": "im Turnsaal"}
                ], "unmappable": []}
                """));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB", "egal"))).getFirst();

        assertEquals(List.of(), profile.wishes());
        assertEquals(2, profile.unmappable().size());
        assertTrue(profile.unmappable().get(0).contains("no unique teacher 'Maria'"));
        assertTrue(profile.unmappable().get(1).contains("no unique room 'Turnsaal'"));
    }

    @Test
    public void teacherMatchesByAbbreviationAndLastName() {
        assertEquals("HU", TeacherWishExtractor.matchTeachers("hu", TEACHERS).getFirst().nameSymbol());
        assertEquals("CD", TeacherWishExtractor.matchTeachers("Mag. Dorn", TEACHERS).getFirst().nameSymbol());
        assertEquals(2, TeacherWishExtractor.matchTeachers("Maria", TEACHERS).size());
        assertEquals(List.of(), TeacherWishExtractor.matchTeachers("Frau", TEACHERS));
    }

    @Test
    public void brokenJsonIsRetriedOnce() {
        final FixedClient answer = new FixedClient(List.of(
                "Hier ist das JSON: {",
                "{\"wishes\": [{\"type\": \"NO_GAPS\", \"degree\": \"MID\", \"sourceSnippet\": \"keine Lücken\"}]}"));

        final TeacherWishProfile profile = new TeacherWishExtractor(answer, cache)
                .extract(snapshot(new WishInput("AB", "keine Lücken"))).getFirst();

        assertEquals(2, answer.calls);
        assertEquals(WishType.NO_GAPS, profile.wishes().getFirst().type());
    }

    @Test
    public void brokenJsonTwiceMovesTheTextToUnmappableWithoutCaching() {
        final FixedClient answer = new FixedClient(List.of("nope", "{\"wishes\": [{\"type\": \"IMPOSSIBLE\"}]}"));
        final TeacherWishExtractor extractor = new TeacherWishExtractor(answer, cache);

        final TeacherWishProfile profile = extractor.extract(snapshot(new WishInput("AB", "keine Lücken")))
                .getFirst();

        assertEquals(2, answer.calls);
        assertEquals(List.of(), profile.wishes());
        assertEquals(List.of("keine Lücken"), profile.unmappable());
        assertFalse(Files.exists(cache));
    }

    /** Counts the calls that reach the wrapped client. */
    private static class CountingClient implements WishExtractionClient {
        private final WishExtractionClient inner;
        int calls;

        CountingClient(final WishExtractionClient inner) {
            this.inner = inner;
        }

        @Override
        public String extract(final String systemPrompt, final String wishText)
                throws IOException, InterruptedException {
            calls++;
            return inner.extract(systemPrompt, wishText);
        }

        @Override
        public String modelId() {
            return inner.modelId();
        }
    }

    /** Hands out the given answers in order, whatever the text. */
    private static class FixedClient implements WishExtractionClient {
        private final Deque<String> answers;
        int calls;

        FixedClient(final List<String> answers) {
            this.answers = new ArrayDeque<>(answers);
        }

        @Override
        public String extract(final String systemPrompt, final String wishText) {
            calls++;
            return answers.isEmpty() ? "" : answers.poll();
        }

        @Override
        public String modelId() {
            return "fixed";
        }
    }
}
