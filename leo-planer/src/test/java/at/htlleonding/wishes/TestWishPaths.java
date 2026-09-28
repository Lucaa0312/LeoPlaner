package at.htlleonding.wishes;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import at.htlleonding.leoplaner.algorithm.Block;
import at.htlleonding.leoplaner.algorithm.Schedule;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.boundary.WishResource;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.repository.TimetableService;
import at.htlleonding.leoplaner.wishes.TeacherWishExtractor;
import at.htlleonding.leoplaner.wishes.WishExtractionClient;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * The wish paths that need the database: extraction against stored teachers
 * and rooms, the double period flags, generating a schedule that prices the
 * wishes, and the extract endpoint. The model is stubbed and the cache kept
 * in a temp file, so src/files is never touched.
 */
@QuarkusTest
public class TestWishPaths {

    private static final String TEXT_AB = "Keine Doppelstunden in der 9WISHA, bitte in Raum 902. Gleiche Tage wie Frau Huber.";
    private static final String TEXT_HU = "Doppelstunden in der 9WISHB. Freitag frei.";

    private static final String ANSWER_AB = """
            { "wishes": [
                { "type": "DOUBLE_PERIOD", "degree": "MID", "className": "9WISHA", "doublePeriodMode": "AVOID" },
                { "type": "ROOM", "degree": "LOW", "className": "9WISHA", "roomName": "Raum 902" },
                { "type": "LINKED_TEACHER", "degree": "LOW", "otherTeacherName": "Frau Huber",
                  "linkMode": "SAME_DAYS" }
              ], "unmappable": [] }
            """;
    private static final String ANSWER_HU = """
            { "wishes": [
                { "type": "DOUBLE_PERIOD", "degree": "MID", "className": "9WISHB", "doublePeriodMode": "PREFER" },
                { "type": "FREE_DAY", "degree": "HIGH", "candidates": ["FRIDAY"] }
              ], "unmappable": [] }
            """;

    /** Answers the two texts above, anything else with nothing. */
    static final class StubClient implements WishExtractionClient {
        @Override
        public String extract(final String systemPrompt, final String wishText) {
            if (wishText.contains("9WISHA")) {
                return ANSWER_AB;
            }
            if (wishText.contains("9WISHB")) {
                return ANSWER_HU;
            }
            return "{\"wishes\":[],\"unmappable\":[]}";
        }

        @Override
        public String modelId() {
            return "stub";
        }
    }

    @Inject
    EntityManager entityManager;

    @Inject
    TimetableService timetableService;

    @Inject
    DataRepository dataRepository;

    @Inject
    SimulatedAnnealingAlgorithm algorithm;

    @Inject
    WishResource wishResource;

    private Path cacheDir;
    private Room roomA;
    private Room roomB;
    private ClassSubject avoided;
    private ClassSubject preferred;
    private ClassSubject stale;

    @BeforeEach
    void setUp() throws IOException {
        cacheDir = Files.createTempDirectory("wish-cache");
        QuarkusMock.installMockForType(new TeacherWishExtractor(new StubClient(), cacheDir.resolve("cache.json")),
                TeacherWishExtractor.class);
        timetableService.setTeacherWishProfiles(null);
    }

    @AfterEach
    void tearDown() throws IOException {
        timetableService.clear();
        timetableService.setTeacherWishProfiles(null);
        try (var files = Files.walk(cacheDir)) {
            files.sorted(java.util.Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
        }
    }

    /** Two classes, three teachers; AB and HU have wish texts. Runs inside the test transaction. */
    private void persistSchool() {
        roomA = room((short) 901, "WISHROOMA");
        roomB = room((short) 902, "WISHROOMB");
        final SchoolClass a = schoolClass("9WISHA", roomA);
        final SchoolClass b = schoolClass("9WISHB", roomB);
        final Teacher ab = teacher("AB", "Anna Berger", TEXT_AB);
        final Teacher hu = teacher("HU", "Maria Huber", TEXT_HU);
        final Teacher cd = teacher("CD", "Chris Dorn", null);

        avoided = lesson(a, 4, ab);
        avoided.setBlockSizes("2,2");
        preferred = lesson(b, 3, hu);
        // left over from an earlier run whose wish was withdrawn
        stale = lesson(b, 2, cd);
        stale.setAvoidDoublePeriod(true);
        lesson(a, 3, hu);
        lesson(b, 3, ab);
        entityManager.flush();
    }

    private Room room(final short number, final String name) {
        final Room room = new Room();
        room.setRoomNumber(number);
        room.setRoomName(name);
        room.setNameShort(name);
        entityManager.persist(room);
        return room;
    }

    private SchoolClass schoolClass(final String name, final Room home) {
        final SchoolClass schoolClass = new SchoolClass();
        schoolClass.setClassName(name);
        schoolClass.setClassRoom(home);
        entityManager.persist(schoolClass);
        return schoolClass;
    }

    private Teacher teacher(final String symbol, final String name, final String wishText) {
        final Teacher teacher = new Teacher();
        teacher.setNameSymbol(symbol);
        teacher.setTeacherName(name);
        teacher.setWishText(wishText);
        entityManager.persist(teacher);
        return teacher;
    }

    private ClassSubject lesson(final SchoolClass schoolClass, final int hours, final Teacher teacher) {
        final ClassSubject cs = new ClassSubject();
        cs.setSchoolClass(schoolClass);
        cs.setWeeklyHours(hours);
        cs.setTeachers(new ArrayList<>(List.of(teacher)));
        entityManager.persist(cs);
        return cs;
    }

    private static TeacherWishProfile profileOf(final List<TeacherWishProfile> profiles, final String teacherId) {
        return profiles.stream().filter(p -> teacherId.equals(p.teacherId())).findFirst().orElseThrow();
    }

    private static TeacherWish wishOf(final TeacherWishProfile profile, final WishType type) {
        return profile.wishes().stream().filter(w -> w.type() == type).findFirst().orElseThrow();
    }

    @Test
    @TestTransaction
    public void extractionResolvesTeachersAndRoomsAgainstTheDatabase() {
        persistSchool();

        final List<TeacherWishProfile> profiles = timetableService.loadTeacherWishProfiles();

        final TeacherWishProfile ab = profileOf(profiles, "TR_AB");
        assertTrue(ab.unmappable().isEmpty(), ab.unmappable().toString());
        assertEquals(roomB.getId(), wishOf(ab, WishType.ROOM).roomId());
        assertEquals("TR_HU", wishOf(ab, WishType.LINKED_TEACHER).otherTeacherId());
        assertEquals(2, profileOf(profiles, "TR_HU").wishes().size());
        assertTrue(Files.exists(cacheDir.resolve("cache.json")), "cache not written to the temp file");
    }

    @Test
    @TestTransaction
    public void doublePeriodWishesSetAndClearTheFlags() {
        persistSchool();

        final List<String> problems = timetableService.applyDoublePeriodWishes(
                timetableService.loadTeacherWishProfiles());

        assertTrue(problems.isEmpty(), problems.toString());
        assertTrue(avoided.isAvoidDoublePeriod());
        assertTrue(preferred.isBetterDoublePeriod());
        assertFalse(stale.isAvoidDoublePeriod(), "withdrawn AVOID wish still splits the lesson");
    }

    @Test
    @TestTransaction
    public void generatedScheduleSplitsAndPricesTheWishes() {
        persistSchool();

        timetableService.generateForAllClasses();

        final Schedule schedule = timetableService.getSchedule();
        assertNotNull(schedule);
        assertNotNull(timetableService.getTeacherWishProfiles());
        assertEquals(List.of(1, 1, 1, 1), lengthsOf(schedule, avoided));
        assertEquals(List.of(2, 1), lengthsOf(schedule, preferred));
        assertEquals(schedule.breakdown().total(), schedule.getTotalCost());

        // the algorithm start hands the wishes to the schedule again
        final List<String> rejected = algorithm.setTeacherWishProfiles(dataRepository.getTeacherWishProfiles());
        assertTrue(rejected.isEmpty(), rejected.toString());
        assertEquals(schedule.breakdown().total(), schedule.getTotalCost());

        assertRoomWishTakenWhereFree(schedule);
    }

    private static List<Integer> lengthsOf(final Schedule schedule, final ClassSubject cs) {
        return schedule.getBlocks().stream()
                .filter(b -> b.getMembers().stream().anyMatch(m -> m.getId().equals(cs.getId())))
                .map(Block::getDuration)
                .sorted(java.util.Comparator.reverseOrder())
                .toList();
    }

    /** AB's lessons in 9WISHA sit in room 902 unless 9WISHB, whose home it is, is in there. */
    private void assertRoomWishTakenWhereFree(final Schedule schedule) {
        final Map<String, Timetable> timetables = schedule.toTimetables(schedule.snapshot(), 0);
        final List<ClassSubjectInstance> classB = timetables.get("9WISHB").getClassSubjectInstances();
        for (final ClassSubjectInstance csi : timetables.get("9WISHA").getClassSubjectInstances()) {
            if (csi.getClassSubject() == null || !csi.getClassSubject().getId().equals(avoided.getId())) {
                continue;
            }
            final boolean roomBBusy = classB.stream().anyMatch(other -> other.getClassSubject() != null
                    && other.getPeriod().getSchoolDays() == csi.getPeriod().getSchoolDays()
                    && other.getPeriod().getSchoolHour() <= csi.getPeriod().getSchoolHour()
                    && csi.getPeriod().getSchoolHour() < other.getPeriod().getSchoolHour() + other.getDuration());
            if (!roomBBusy) {
                assertEquals(roomB.getId(), csi.getRoom().getId(), "wished room free but not taken");
            }
        }
    }

    @Test
    @TestTransaction
    public void dataRepositoryLoadsTheWishesOnFirstUse() {
        persistSchool();
        assertEquals(null, timetableService.getTeacherWishProfiles());

        final List<TeacherWishProfile> profiles = dataRepository.getTeacherWishProfiles();

        assertNotNull(profileOf(profiles, "TR_AB"));
        assertTrue(profiles == dataRepository.getTeacherWishProfiles(), "loaded again instead of reused");
    }

    @Test
    @TestTransaction
    @SuppressWarnings("unchecked")
    public void extractResourceStoresTheProfilesForTheNextRun() {
        persistSchool();

        final var response = wishResource.extract();

        assertEquals(200, response.getStatus());
        final List<TeacherWishProfile> returned = (List<TeacherWishProfile>) response.getEntity();
        assertNotNull(profileOf(returned, "TR_AB"));
        assertTrue(returned == timetableService.getTeacherWishProfiles());
    }

    @Test
    public void extractEndpointAnswersOverHttp() {
        given().when().post("/api/wishes/extract").then().statusCode(200);
    }
}
