package at.htlleonding.leoplaner.wishes;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Turns the teachers' wish texts into TeacherWishProfiles.
 *
 * The model only ever sees the text: no names, no teacher list. Teachers and
 * rooms it mentions come back as written and are resolved here, against the
 * database; whatever does not resolve to exactly one match goes to unmappable
 * rather than to the nearest guess.
 *
 * Answers are cached per text hash, model and prompt version, so the model is
 * only asked again when one of them changed. The cache holds the raw answer,
 * resolution runs on every call because teachers and rooms can change.
 */
@ApplicationScoped
public class TeacherWishExtractor {

    public static final String CACHE_PATH = "src/files/teacherWishCache.json";

    private static final String TEACHER_PREFIX = "TR_";
    private static final int ATTEMPTS = 2;
    // words in front of a name that are not part of it
    private static final Set<String> TITLES = Set.of(
            "frau", "herr", "hr", "fr", "kollege", "kollegin", "prof", "mag", "dr", "di", "dipl", "ing");

    public record WishInput(String nameSymbol, String text) {
    }

    public record TeacherRef(String nameSymbol, String teacherName) {
    }

    public record RoomRef(Long id, short number, String name, String nameShort) {
    }

    /** Everything extraction needs from the database, read up front so no transaction spans a model call. */
    public record Snapshot(List<WishInput> inputs, List<TeacherRef> teachers, List<RoomRef> rooms) {
    }

    /** The model's answer, before anything is resolved. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Answer(List<TeacherWish> wishes, List<String> unmappable) {
        public Answer {
            wishes = wishes == null ? List.of() : wishes;
            unmappable = unmappable == null ? List.of() : unmappable;
        }
    }

    public record CacheEntry(String model, String promptVersion, Answer answer) {
    }

    @Inject
    WishExtractionClient client;

    private Path cacheFile = Path.of(CACHE_PATH);
    private final ObjectMapper mapper = new ObjectMapper();

    public TeacherWishExtractor() {
    }

    public TeacherWishExtractor(final WishExtractionClient client, final Path cacheFile) {
        this.client = client;
        this.cacheFile = cacheFile;
    }

    public List<TeacherWishProfile> extractAll() {
        return extract(snapshot());
    }

    @Transactional
    public Snapshot snapshot() {
        final List<WishInput> inputs = new ArrayList<>();
        final List<TeacherRef> teachers = new ArrayList<>();

        for (final Teacher teacher : Teacher.getAllTeachers()) {
            if (teacher.getNameSymbol() == null) {
                continue;
            }
            teachers.add(new TeacherRef(teacher.getNameSymbol(), teacher.getTeacherName()));
            if (teacher.getWishText() != null && !teacher.getWishText().isBlank()) {
                inputs.add(new WishInput(teacher.getNameSymbol(), teacher.getWishText()));
            }
        }

        final List<RoomRef> rooms = Room.getAllRooms().stream()
                .map(r -> new RoomRef(r.getId(), r.getRoomNumber(), r.getRoomName(), r.getNameShort()))
                .toList();

        return new Snapshot(inputs, teachers, rooms);
    }

    public synchronized List<TeacherWishProfile> extract(final Snapshot snapshot) {
        final Map<String, CacheEntry> cache = readCache();
        final String model = client.modelId();
        final String version = WishResources.version();
        final String prompt = WishResources.systemPrompt();
        final List<TeacherWishProfile> profiles = new ArrayList<>();
        boolean cacheChanged = false;

        for (final WishInput input : snapshot.inputs()) {
            final String text = TimetableExportImporter.normalizeWishText(input.text());
            if (text == null || text.isEmpty()) {
                continue;
            }
            final String hash = TimetableExportImporter.hash(text);

            final CacheEntry cached = cache.get(hash);
            Answer answer;
            if (cached != null && model.equals(cached.model()) && version.equals(cached.promptVersion())) {
                answer = cached.answer();
            } else {
                answer = ask(prompt, text, input.nameSymbol());
                if (answer == null) {
                    // left out of the cache, so the next run asks again
                    answer = new Answer(List.of(), List.of(text));
                } else {
                    cache.put(hash, new CacheEntry(model, version, answer));
                    cacheChanged = true;
                }
            }

            profiles.add(toProfile(input.nameSymbol(), hash, answer, snapshot));
        }

        if (cacheChanged) {
            writeCache(cache);
        }
        return profiles;
    }

    /** Null when no attempt gave an answer that parses. */
    private Answer ask(final String prompt, final String text, final String nameSymbol) {
        for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
            try {
                return mapper.readValue(client.extract(prompt, text), Answer.class);
            } catch (IOException e) {
                System.out.println("Wish extraction for " + nameSymbol + " failed (attempt " + attempt + "): "
                        + e.getMessage());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
        return null;
    }

    private TeacherWishProfile toProfile(final String nameSymbol, final String hash, final Answer answer,
            final Snapshot snapshot) {
        final List<TeacherWish> valid = new ArrayList<>();
        final List<String> unmappable = new ArrayList<>(answer.unmappable());

        for (final TeacherWish wish : answer.wishes()) {
            if (wish == null) {
                continue;
            }

            final TeacherWish resolved = resolve(wish, snapshot);
            final List<String> problems = resolved == null
                    ? List.of(wish.type() == WishType.ROOM
                            ? "no unique room '" + wish.roomName() + "'"
                            : "no unique teacher '" + wish.otherTeacherName() + "'")
                    : resolved.problems();

            if (problems.isEmpty()) {
                valid.add(resolved);
            } else {
                final String what = wish.sourceSnippet() != null ? wish.sourceSnippet() : String.valueOf(wish.type());
                unmappable.add(what + " (" + String.join(", ", problems) + ")");
                System.out.println("Wish of " + nameSymbol + " not usable: " + what + " - "
                        + String.join(", ", problems));
            }
        }

        return new TeacherWishProfile(TEACHER_PREFIX + nameSymbol, hash, valid, unmappable);
    }

    /**
     * Fills in otherTeacherId and roomId from what the text says; ids the model
     * may have made up are dropped. Null when a name is given but does not
     * match exactly one teacher or room.
     */
    private TeacherWish resolve(final TeacherWish wish, final Snapshot snapshot) {
        String otherTeacherId = null;
        Long roomId = null;

        if (wish.type() == WishType.LINKED_TEACHER && wish.otherTeacherName() != null) {
            final List<TeacherRef> matches = matchTeachers(wish.otherTeacherName(), snapshot.teachers());
            if (matches.size() != 1) {
                return null;
            }
            otherTeacherId = TEACHER_PREFIX + matches.getFirst().nameSymbol();
        }

        if (wish.type() == WishType.ROOM && wish.roomName() != null) {
            final List<RoomRef> matches = matchRooms(wish.roomName(), snapshot.rooms());
            if (matches.size() != 1) {
                return null;
            }
            roomId = matches.getFirst().id();
        }

        return new TeacherWish(wish.type(), wish.degree(), wish.count(), wish.hour(), wish.day(),
                wish.candidates(), otherTeacherId, wish.otherTeacherName(), wish.linkMode(), wish.className(),
                wish.doublePeriodMode(), wish.roomName(), roomId, wish.sourceSnippet());
    }

    /**
     * An abbreviation, a full name, or just a first or last name; titles such
     * as "Frau" or "Mag." are ignored.
     */
    public static List<TeacherRef> matchTeachers(final String written, final List<TeacherRef> teachers) {
        final List<String> words = words(written).stream().filter(w -> !TITLES.contains(w)).toList();
        if (words.isEmpty()) {
            return List.of();
        }

        if (words.size() == 1) {
            final List<TeacherRef> bySymbol = teachers.stream()
                    .filter(t -> words.getFirst().equalsIgnoreCase(t.nameSymbol()))
                    .toList();
            if (!bySymbol.isEmpty()) {
                return bySymbol;
            }
        }

        return teachers.stream()
                .filter(t -> t.teacherName() != null && words(t.teacherName()).containsAll(words))
                .toList();
    }

    /** Number, name, short name or number and name together ("101EDUARD"), with an optional "Raum". */
    public static List<RoomRef> matchRooms(final String written, final List<RoomRef> rooms) {
        final String wanted = compact(written).replaceFirst("^raum", "");
        if (wanted.isEmpty()) {
            return List.of();
        }

        return rooms.stream()
                .filter(r -> wanted.equals(String.valueOf(r.number()))
                        || wanted.equals(compact(r.name()))
                        || wanted.equals(compact(r.nameShort()))
                        || wanted.equals(r.number() + compact(r.name())))
                .toList();
    }

    private static List<String> words(final String s) {
        return Arrays.stream(s.toLowerCase(Locale.ROOT).split("[^\\p{L}]+"))
                .filter(w -> !w.isEmpty())
                .toList();
    }

    private static String compact(final String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT).replaceAll("[\\s.]+", "");
    }

    private Map<String, CacheEntry> readCache() {
        if (!Files.exists(cacheFile)) {
            return new LinkedHashMap<>();
        }
        try {
            return mapper.readValue(cacheFile.toFile(), new TypeReference<LinkedHashMap<String, CacheEntry>>() {
            });
        } catch (IOException e) {
            // a broken cache only costs model calls, never the run
            System.out.println("Could not read " + cacheFile + ", starting empty: " + e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private void writeCache(final Map<String, CacheEntry> cache) {
        try {
            if (cacheFile.getParent() != null) {
                Files.createDirectories(cacheFile.getParent());
            }
            mapper.writer().with(SerializationFeature.INDENT_OUTPUT).writeValue(cacheFile.toFile(), cache);
        } catch (IOException e) {
            System.out.println("Could not write " + cacheFile + ": " + e.getMessage());
        }
    }
}
