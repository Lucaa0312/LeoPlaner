package at.htlleonding.leoplaner.wishes;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
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
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.DoublePeriodMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.LinkMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishDegree;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.data.TimetableManager;
import at.htlleonding.leoplaner.wishes.WishEvidence.HourMeaning;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Turns the teachers' wish texts into TeacherWishProfiles.
 *
 * The model only ever sees the text: no names, no teacher list. Teachers,
 * rooms and classes it mentions come back as written and are resolved here,
 * against the database; whatever does not resolve to exactly one match goes
 * to unmappable rather than to the nearest guess. Hour and degree are worked
 * out by WishEvidence from what the model quotes.
 *
 * Answers are cached per text hash, model and prompt version, so the model is
 * only asked again when one of them changed. The cache holds the raw answer,
 * resolution runs on every call because teachers and rooms can change.
 *
 * An answer a human corrected (saveReview, or by hand in the cache file with
 * "reviewed": true) is kept across model and prompt changes; hour and degree
 * written there win over the quotes.
 *
 * Only one extraction runs at a time, and it can take half an hour with a
 * local model. Reviewing goes on meanwhile: the cache file is read and
 * written entry by entry, never held in memory across a model call.
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
    public record Snapshot(List<WishInput> inputs, List<TeacherRef> teachers, List<RoomRef> rooms,
            List<String> classNames) {
    }

    /**
     * One wish as the model writes it. strengthWords, essential, hourMention
     * and hourMeaning are its evidence for degree and hour; the model's schema
     * has neither of the two, a hand-written answer may give them directly.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ModelWish(
            WishType type,
            WishDegree degree,
            List<String> strengthWords,
            Boolean essential,
            Integer hour,
            String hourMention,
            HourMeaning hourMeaning,
            Integer count,
            SchoolDays day,
            List<SchoolDays> candidates,
            String otherTeacherName,
            LinkMode linkMode,
            String className,
            DoublePeriodMode doublePeriodMode,
            String roomName,
            String sourceSnippet) {
    }

    /** The model's answer, before anything is resolved. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Answer(List<ModelWish> wishes, List<String> unmappable) {
        public Answer {
            wishes = wishes == null ? List.of() : wishes;
            unmappable = unmappable == null ? List.of() : unmappable;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CacheEntry(String model, String promptVersion, Answer answer, boolean reviewed) {
    }

    /** How far the running or the last extraction got; error is set when it broke off. */
    public record Progress(boolean running, int done, int total, String error) {
    }

    /** One teacher's text next to what was made of it, for a human to check. */
    public record ReviewItem(String teacherId, String textHash, String text, List<TeacherWish> wishes,
            List<String> unmappable, boolean extracted, boolean reviewed) {
    }

    @Inject
    WishExtractionClient client;

    private Path cacheFile = Path.of(CACHE_PATH);
    private final Object cacheLock = new Object();
    private volatile Progress progress = new Progress(false, 0, 0, null);
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

        final List<String> classNames = SchoolClass.<SchoolClass>listAll().stream()
                .map(SchoolClass::getClassName)
                .toList();

        return new Snapshot(inputs, teachers, rooms, classNames);
    }

    public synchronized List<TeacherWishProfile> extract(final Snapshot snapshot) {
        final String model = client.modelId();
        final String version = WishResources.version();
        final String prompt = WishResources.systemPrompt();
        final List<TeacherWishProfile> profiles = new ArrayList<>();
        final int total = snapshot.inputs().size();
        int done = 0;
        progress = new Progress(true, 0, total, null);

        try {
            for (final WishInput input : snapshot.inputs()) {
                progress = new Progress(true, done++, total, null);
                profiles.add(extractOne(input, prompt, model, version, snapshot));
            }
            profiles.removeIf(p -> p == null);
            progress = new Progress(false, total, total, null);
        } catch (RuntimeException e) {
            progress = new Progress(false, done, total, String.valueOf(e.getMessage()));
            throw e;
        }
        return profiles;
    }

    public Progress progress() {
        return progress;
    }

    /** Null for an empty text. */
    private TeacherWishProfile extractOne(final WishInput input, final String prompt, final String model,
            final String version, final Snapshot snapshot) {
        final String text = TimetableExportImporter.normalizeWishText(input.text());
        if (text == null || text.isEmpty()) {
            return null;
        }
        final String hash = TimetableExportImporter.hash(text);

        final CacheEntry cached = readCache().get(hash);
        Answer answer;
        final boolean reviewed = usable(cached, model, version) && cached.reviewed();
        if (usable(cached, model, version)) {
            answer = cached.answer();
        } else {
            answer = ask(prompt, text, input.nameSymbol());
            if (answer == null) {
                // left out of the cache, so the next run asks again
                answer = new Answer(List.of(), List.of(text));
            } else {
                store(hash, new CacheEntry(model, version, answer, false));
            }
        }

        return toProfile(input.nameSymbol(), hash, text, answer, reviewed, snapshot);
    }

    /** A human's version of one text's answer; it is not asked or checked again. */
    public void saveReview(final String textHash, final Answer answer) {
        store(textHash, new CacheEntry(client.modelId(), WishResources.version(), answer, true));
    }

    /** Forgets one text's answer, reviewed or not, so the next extraction asks the model again. */
    public void forget(final String textHash) {
        synchronized (cacheLock) {
            final Map<String, CacheEntry> cache = readCache();
            if (cache.remove(textHash) != null) {
                writeCache(cache);
            }
        }
    }

    private void store(final String hash, final CacheEntry entry) {
        synchronized (cacheLock) {
            final Map<String, CacheEntry> cache = readCache();
            final CacheEntry present = cache.get(hash);
            // a review saved while the model was still reading wins
            if (present != null && present.reviewed() && !entry.reviewed()) {
                return;
            }
            cache.put(hash, entry);
            writeCache(cache);
        }
    }

    /** Every wish text with its cached result; never asks the model. */
    public List<ReviewItem> review(final Snapshot snapshot) {
        final Map<String, CacheEntry> cache = readCache();
        final String model = client.modelId();
        final String version = WishResources.version();
        final List<ReviewItem> items = new ArrayList<>();

        for (final WishInput input : snapshot.inputs()) {
            final String text = TimetableExportImporter.normalizeWishText(input.text());
            if (text == null || text.isEmpty()) {
                continue;
            }
            final String hash = TimetableExportImporter.hash(text);
            final CacheEntry cached = cache.get(hash);

            if (usable(cached, model, version)) {
                final TeacherWishProfile profile = toProfile(input.nameSymbol(), hash, text, cached.answer(),
                        cached.reviewed(), snapshot);
                items.add(new ReviewItem(profile.teacherId(), hash, text, profile.wishes(), profile.unmappable(),
                        true, cached.reviewed()));
            } else {
                items.add(new ReviewItem(TEACHER_PREFIX + input.nameSymbol(), hash, text, List.of(), List.of(),
                        false, false));
            }
        }
        return items;
    }

    private static boolean usable(final CacheEntry cached, final String model, final String version) {
        return cached != null && cached.answer() != null
                && (cached.reviewed() || (model.equals(cached.model()) && version.equals(cached.promptVersion())));
    }

    /** Null when no attempt gave an answer that parses. */
    private Answer ask(final String prompt, final String text, final String nameSymbol) {
        for (int attempt = 1; attempt <= ATTEMPTS; attempt++) {
            try {
                // a thinking model can use up its tokens before it answers, so the retry goes without
                final String raw = attempt == 1 ? client.extract(prompt, text) : client.extractPlain(prompt, text);
                return mapper.readValue(raw, Answer.class);
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

    /** reviewed: a human wrote the answer, its days are not checked against the text again. */
    private TeacherWishProfile toProfile(final String nameSymbol, final String hash, final String text,
            final Answer answer, final boolean reviewed, final Snapshot snapshot) {
        final List<TeacherWish> valid = new ArrayList<>();
        final List<TeacherWish> seen = new ArrayList<>();
        final List<String> unmappable = new ArrayList<>(answer.unmappable());

        for (final ModelWish written : answer.wishes()) {
            if (written == null) {
                continue;
            }

            final List<TeacherWish> wishes = interpret(written, text, !reviewed);
            if (wishes.isEmpty()) {
                final String what = written.sourceSnippet() != null ? written.sourceSnippet()
                        : String.valueOf(written.type());
                unmappable.add(what + " (day not in the text)");
                System.out.println("Wish of " + nameSymbol + " not usable: " + what + " - day not in the text");
            }

            for (final TeacherWish wish : wishes) {
                final String className = matchClass(wish.className(), snapshot.classNames());
                final TeacherWish resolved = className == null && wish.className() != null ? null
                        : resolve(wish, className, snapshot);
                final List<String> problems = resolved != null ? problems(resolved, reviewed)
                        : List.of(className == null && wish.className() != null
                                ? "no class '" + wish.className() + "'"
                                : wish.type() == WishType.ROOM
                                        ? "no unique room '" + wish.roomName() + "'"
                                        : "no unique teacher '" + wish.otherTeacherName() + "'");

                if (problems.isEmpty()) {
                    // the same wish read out of two passages counts once
                    final TeacherWish bare = withSnippet(resolved, null);
                    if (!seen.contains(bare)) {
                        seen.add(bare);
                        valid.add(resolved);
                    }
                } else {
                    final String what = wish.sourceSnippet() != null ? wish.sourceSnippet()
                            : String.valueOf(wish.type());
                    unmappable.add(what + " (" + String.join(", ", problems) + ")");
                    System.out.println("Wish of " + nameSymbol + " not usable: " + what + " - "
                            + String.join(", ", problems));
                }
            }
        }

        return new TeacherWishProfile(TEACHER_PREFIX + nameSymbol, hash, valid, unmappable);
    }

    /** problems() and, for the model's own answers, wishes that would change nothing in any timetable. */
    private static List<String> problems(final TeacherWish wish, final boolean reviewed) {
        final List<String> problems = new ArrayList<>(wish.problems());
        if (reviewed || !problems.isEmpty()) {
            return problems;
        }
        final boolean noEffect = switch (wish.type()) {
            case EARLIEST_START -> wish.hour() <= TimetableManager.FIRST_SCHOOL_HOUR;
            case LATEST_END -> wish.hour() >= TimetableManager.LAST_SCHOOL_HOUR;
            case MAX_CONSECUTIVE, MAX_HOURS_PER_DAY -> wish.count() >= TimetableManager.LAST_SCHOOL_HOUR;
            default -> false;
        };
        if (noEffect) {
            problems.add("has no effect, check the text");
        }
        return problems;
    }

    /**
     * Hour and degree from the model's quotes, and day and candidates where
     * the type reads them: free days and afternoons take candidates, the
     * other types a single day, so several days become one wish each. Days
     * the text does not name are left out; empty when none of them remains.
     */
    private static List<TeacherWish> interpret(final ModelWish w, final String text, final boolean checkDays) {
        if (w.type() == null) {
            return List.of(wish(w, null, null, null, null));
        }

        final WishDegree degree = w.degree() != null ? w.degree()
                : WishEvidence.degree(w.strengthWords(), w.sourceSnippet(), Boolean.TRUE.equals(w.essential()), text);

        final boolean timed = w.type() == WishType.LATEST_END || w.type() == WishType.EARLIEST_START
                || w.type() == WishType.FREE_AFTERNOON;
        final Integer hour = w.hour() != null || !timed ? w.hour()
                : WishEvidence.hour(w.type(), w.hourMention(), w.hourMeaning(), text);

        final boolean free = w.type() == WishType.FREE_DAY || w.type() == WishType.FREE_AFTERNOON;
        final boolean single = w.type() == WishType.LATEST_END || w.type() == WishType.EARLIEST_START;

        final List<SchoolDays> written = new ArrayList<>();
        if (w.candidates() != null && (free || single)) {
            w.candidates().stream().filter(d -> d != null && !written.contains(d)).forEach(written::add);
        }
        // ranked candidates come first, day is only read where the model filled it instead
        if (w.day() != null && !written.contains(w.day()) && !(free && !written.isEmpty())) {
            written.add(single ? 0 : written.size(), w.day());
        }

        List<SchoolDays> days = written;
        if (checkDays && !written.isEmpty()) {
            // every day of the week is the model's way of saying any day, then only the passage itself counts
            final boolean anyDay = written.containsAll(List.of(SchoolDays.schedulableDays()));
            days = WishEvidence.mentioned(written, w.sourceSnippet(), anyDay ? null : text);
            if (days.isEmpty() && !anyDay) {
                return List.of();
            }
        }
        if (checkDays && free && !days.isEmpty() && WishEvidence.flexible(w.sourceSnippet())) {
            // "Mittwoch wäre toll, bin aber flexibel": the named days first, any other after them
            final List<SchoolDays> ranked = new ArrayList<>(days);
            for (final SchoolDays day : SchoolDays.schedulableDays()) {
                if (!ranked.contains(day)) {
                    ranked.add(day);
                }
            }
            days = ranked;
        }
        final List<SchoolDays> kept = days;

        if (w.type() == WishType.FREE_AFTERNOON && w.count() != null && checkDays) {
            final Integer count = WishEvidence.freeAfternoons(w.count(), w.sourceSnippet());
            if (!w.count().equals(count)) {
                // which afternoons stay free is not said, only how many
                return List.of(new TeacherWish(w.type(), degree, count == null ? Integer.valueOf(0) : count, hour,
                        null, List.of(), null, null, null, null, null, null, null, w.sourceSnippet()));
            }
        }
        if (free) {
            return List.of(wish(w, degree, hour, null, kept));
        }
        if (single && !kept.isEmpty()) {
            return kept.stream().map(d -> wish(w, degree, hour, d, null)).toList();
        }
        return List.of(wish(w, degree, hour, kept.isEmpty() ? null : kept.getFirst(), null));
    }

    private static TeacherWish wish(final ModelWish w, final WishDegree degree, final Integer hour,
            final SchoolDays day, final List<SchoolDays> candidates) {
        return new TeacherWish(w.type(), degree, w.count(), hour, day, candidates, null, w.otherTeacherName(),
                w.linkMode(), w.className(), w.doublePeriodMode(), w.roomName(), null, w.sourceSnippet());
    }

    private static TeacherWish withSnippet(final TeacherWish wish, final String snippet) {
        return new TeacherWish(wish.type(), wish.degree(), wish.count(), wish.hour(), wish.day(),
                wish.candidates(), wish.otherTeacherId(), wish.otherTeacherName(), wish.linkMode(),
                wish.className(), wish.doublePeriodMode(), wish.roomName(), wish.roomId(), snippet);
    }

    /**
     * Fills in otherTeacherId and roomId from what the text says; ids the model
     * may have made up are dropped. Null when a name is given but does not
     * match exactly one teacher or room.
     */
    private TeacherWish resolve(final TeacherWish wish, final String className, final Snapshot snapshot) {
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
                wish.candidates(), otherTeacherId, wish.otherTeacherName(), wish.linkMode(), className,
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

    /**
     * The class as the database spells it ("5A HIF" is 5AHIF), null when there
     * is none - a subject such as "MINF" is not a class.
     */
    public static String matchClass(final String written, final List<String> classNames) {
        if (written == null) {
            return null;
        }
        final String wanted = compact(written);
        return classNames.stream()
                .filter(c -> wanted.equals(compact(c)))
                .findFirst()
                .orElse(null);
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
            synchronized (cacheLock) {
                return mapper.readValue(cacheFile.toFile(), new TypeReference<LinkedHashMap<String, CacheEntry>>() {
                });
            }
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
            // written beside the file and moved over it, so a reader never sees half a cache
            final Path fresh = cacheFile.resolveSibling(cacheFile.getFileName() + ".tmp");
            mapper.writer().with(SerializationFeature.INDENT_OUTPUT).writeValue(fresh.toFile(), cache);
            Files.move(fresh, cacheFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            System.out.println("Could not write " + cacheFile + ": " + e.getMessage());
        }
    }
}
