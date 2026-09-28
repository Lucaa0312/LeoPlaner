package at.htlleonding.leoplaner.data;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import at.htlleonding.leoplaner.dto.GpuImportResultDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Imports the Untis GPU text exports: GPU006 (subjects) and GPU002 (lessons).
 *
 * Every GPU lesson becomes one ClassSubject per class it is taught to, all of
 * them sharing a coupling key so the solver schedules them as one lesson.
 * Only what belongs into the week's timetable is taken:
 * - rows without a class are duties (director, custodian, office hour) and are left out
 * - yearly lessons (flag J), electives (statistics code F) and administrative
 *   entries (codes V and K) are left out
 * - classes whose name does not start with the year (FS1, HDIV, ...) are work
 *   outside the school, not classes
 * - only lessons active on the reference date are taken, otherwise the workshop
 *   rotations of a whole year would stack on top of each other
 *
 * The export carries no double period settings (Untis fields 28 to 30 are
 * empty), so the lengths come from blockSizesFor and can be edited afterwards.
 */
@ApplicationScoped
public class GpuImporter {

    public static final String SUBJECTS_PATH = "src/files/GPU006.TXT";
    public static final String LESSONS_PATH = "src/files/GPU002db.TXT";

    public static final String SKIP_NO_CLASS = "noClass";
    public static final String SKIP_YEARLY = "yearly";
    public static final String SKIP_ELECTIVE = "elective";
    public static final String SKIP_ADMINISTRATIVE = "administrative";
    public static final String SKIP_PSEUDO_CLASS = "notAClass";
    public static final String SKIP_INACTIVE = "notActiveOnDate";

    public static final String RELIGION = "REL";
    public static final String SPORTS = "BSP";

    /**
     * Languages and maths are learned in small doses: their hours are spread
     * over the week as single hours instead of taught as doubles. Matched on
     * the Untis alias, which groups the variants (0D, 1D, 0DUK, ...).
     */
    private static final Set<String> SPREAD_ALIASES = Set.of("D", "DUK", "E1", "E2", "EKO1", "AM", "SPA");

    /** Workshops run as one long block, but no longer than a working day. */
    static final int MAX_WORKSHOP_BLOCK = 8;
    private static final String WORKSHOP_LOAD_GROUP = "L4";

    // Abendschule and Kolleg (DP_CIF): 2ABIF, 3ACIFT, ... and the Vorbereitungslehrgang 1AVIF
    private static final Pattern EVENING_CLASS = Pattern.compile("\\d+A[BC]IFT?|1AVIF");

    private static final DateTimeFormatter GPU_DATE = DateTimeFormatter.BASIC_ISO_DATE;

    // GPU006 columns
    private static final int SUBJECT_SYMBOL = 0;
    private static final int SUBJECT_NAME = 1;
    private static final int SUBJECT_STATISTICS = 2;
    private static final int SUBJECT_LOAD_GROUP = 13;
    private static final int SUBJECT_BACKGROUND = 18;
    private static final int SUBJECT_ALIAS = 20;

    // GPU002 columns
    private static final int LESSON_NUMBER = 0;
    private static final int LESSON_HOURS = 1;
    private static final int LESSON_CLASS_HOURS = 2;
    private static final int LESSON_CLASS = 4;
    private static final int LESSON_TEACHER = 5;
    private static final int LESSON_SUBJECT = 6;
    private static final int LESSON_ROOM = 7;
    private static final int LESSON_FROM = 14;
    private static final int LESSON_TO = 15;
    private static final int LESSON_HOME_ROOM = 19;
    private static final int LESSON_FLAGS = 23;

    @Inject
    DataRepository dataRepository;

    public record GpuSubject(String symbol, String name, String statistics, String loadGroup, String alias,
            RgbColor color) {
    }

    public record GpuClass(String name, String homeRoom, int firstHour, int lastHour) {
    }

    public record GpuClassSubject(String className, String subjectSymbol, int weeklyHours,
            List<String> teacherSymbols, String couplingKey, String parallelGroup, String blockSizes,
            List<String> fixedRooms) {
    }

    public record MappedGpu(LocalDate referenceDate, List<GpuSubject> subjects, Set<String> rooms,
            List<GpuClass> classes, List<GpuClassSubject> classSubjects, int lessons, int coupledLessons,
            int parallelLessons, Map<String, Integer> skippedLessons, List<String> warnings) {
    }

    /** referenceDate null means the start of the school year, the earliest date in the export. */
    @Transactional
    public GpuImportResultDTO importGpu(final byte[] subjectBytes, final byte[] lessonBytes,
            final LocalDate referenceDate) {
        final MappedGpu mapped = map(parse(subjectBytes), parse(lessonBytes), referenceDate);

        final Map<String, Subject> subjects = Subject.<Subject>listAll().stream()
                .filter(s -> s.getSubjectSymbol() != null)
                .collect(Collectors.toMap(Subject::getSubjectSymbol, Function.identity(), (a, b) -> a));
        int createdSubjects = 0;
        int updatedSubjects = 0;
        for (final GpuSubject imported : mapped.subjects()) {
            Subject subject = subjects.get(imported.symbol());
            if (subject == null) {
                subject = new Subject();
                subject.setSubjectSymbol(imported.symbol());
                subject.setRequiredRoomTypes(new ArrayList<>());
                subject.setSubjectName(imported.name());
                subject.setSubjectColor(imported.color());
                // not dataRepository.addSubject: it merges, and the ClassSubjects need the managed instance
                subject.persist();
                subjects.put(imported.symbol(), subject);
                createdSubjects++;
            } else {
                subject.setSubjectName(imported.name());
                subject.setSubjectColor(imported.color());
                updatedSubjects++;
            }
        }

        final Map<String, Room> rooms = Room.<Room>listAll().stream()
                .filter(r -> r.getNameShort() != null)
                .collect(Collectors.toMap(Room::getNameShort, Function.identity(), (a, b) -> a));
        int createdRooms = 0;
        for (final String code : mapped.rooms()) {
            if (!rooms.containsKey(code)) {
                rooms.put(code, dataRepository.addRoom(newRoom(code)));
                createdRooms++;
            }
        }

        final Map<String, SchoolClass> classes = SchoolClass.<SchoolClass>listAll().stream()
                .collect(Collectors.toMap(SchoolClass::getClassName, Function.identity(), (a, b) -> a));
        int createdClasses = 0;
        int updatedClasses = 0;
        for (final GpuClass imported : mapped.classes()) {
            final Room homeRoom = imported.homeRoom() == null ? null : rooms.get(imported.homeRoom());
            SchoolClass schoolClass = classes.get(imported.name());
            final boolean isNew = schoolClass == null;
            if (isNew) {
                schoolClass = new SchoolClass();
                schoolClass.setClassName(imported.name());
            } else {
                removeClassSubjects(schoolClass);
                updatedClasses++;
            }
            if (homeRoom != null || isNew) {
                schoolClass.setClassRoom(homeRoom);
            }
            schoolClass.setFirstHour(imported.firstHour());
            schoolClass.setLastHour(imported.lastHour());
            if (isNew) {
                classes.put(imported.name(), dataRepository.addSchoolClass(schoolClass));
                createdClasses++;
            }
        }

        final Map<String, Teacher> teachers = Teacher.<Teacher>listAll().stream()
                .filter(t -> t.getNameSymbol() != null)
                .collect(Collectors.toMap(Teacher::getNameSymbol, Function.identity(), (a, b) -> a));
        final Map<Teacher, Set<Subject>> subjectsByTeacher = new LinkedHashMap<>();
        int createdTeachers = 0;
        for (final GpuClassSubject imported : mapped.classSubjects()) {
            final Subject subject = subjects.get(imported.subjectSymbol());
            final List<Teacher> lessonTeachers = new ArrayList<>();
            for (final String symbol : imported.teacherSymbols()) {
                Teacher teacher = teachers.get(symbol);
                if (teacher == null) {
                    // not part of the timetable export, so nothing is known but the symbol
                    teacher = new Teacher();
                    teacher.setNameSymbol(symbol);
                    teacher.setTeacherName(symbol);
                    teachers.put(symbol, dataRepository.addTeacher(teacher));
                    createdTeachers++;
                }
                lessonTeachers.add(teacher);
                subjectsByTeacher.computeIfAbsent(teacher, t -> new LinkedHashSet<>()).add(subject);
            }

            final ClassSubject classSubject = new ClassSubject();
            classSubject.setSchoolClass(classes.get(imported.className()));
            classSubject.setSubject(subject);
            classSubject.setTeachers(lessonTeachers);
            classSubject.setWeeklyHours(imported.weeklyHours());
            classSubject.setCouplingKey(imported.couplingKey());
            classSubject.setParallelGroup(imported.parallelGroup());
            classSubject.setBlockSizes(imported.blockSizes());
            for (final String code : imported.fixedRooms()) {
                classSubject.getFixedRooms().add(rooms.get(code));
            }
            dataRepository.addClassSubject(classSubject);
        }

        // replace, not merge, so importing the same files twice is idempotent
        subjectsByTeacher.forEach((teacher, taught) -> {
            teacher.getTeachingSubject().clear();
            teacher.getTeachingSubject().addAll(taught);
        });

        return new GpuImportResultDTO(mapped.referenceDate().toString(), createdSubjects, updatedSubjects,
                createdRooms, createdClasses, updatedClasses, createdTeachers, mapped.classSubjects().size(),
                mapped.lessons(), mapped.coupledLessons(), mapped.parallelLessons(), mapped.skippedLessons(),
                mapped.warnings(), feasibility(mapped, teachers));
    }

    /**
     * What cannot fit however the lessons are placed: a teacher with more
     * lessons than hours they are available in, or a fixed room booked for more
     * hours than a week has. Found here, the solver does not have to be run to
     * learn that zero is out of reach.
     */
    static List<String> feasibility(final MappedGpu mapped, final Map<String, Teacher> teachers) {
        final Map<String, GpuClass> classes = mapped.classes().stream()
                .collect(Collectors.toMap(GpuClass::name, Function.identity()));
        final Map<String, GpuClassSubject> lessons = new LinkedHashMap<>();
        for (final GpuClassSubject cs : mapped.classSubjects()) {
            lessons.putIfAbsent(cs.couplingKey(), cs);
        }

        final Map<String, Integer> hoursByTeacher = new TreeMap<>();
        final Map<String, Set<Integer>> windowByTeacher = new HashMap<>();
        final Map<String, Integer> hoursByRoom = new TreeMap<>();
        for (final GpuClassSubject cs : mapped.classSubjects()) {
            final GpuClass schoolClass = classes.get(cs.className());
            for (final String teacher : cs.teacherSymbols()) {
                final Set<Integer> window = windowByTeacher.computeIfAbsent(teacher, t -> new HashSet<>());
                for (int hour = schoolClass.firstHour(); hour <= schoolClass.lastHour(); hour++) {
                    window.add(hour);
                }
            }
        }
        for (final GpuClassSubject lesson : lessons.values()) {
            lesson.teacherSymbols().forEach(t -> hoursByTeacher.merge(t, lesson.weeklyHours(), Integer::sum));
            lesson.fixedRooms().forEach(r -> hoursByRoom.merge(r, lesson.weeklyHours(), Integer::sum));
        }

        final List<String> problems = new ArrayList<>();
        final int days = SchoolDays.schedulableDays().length;
        hoursByTeacher.forEach((symbol, hours) -> {
            final Set<Integer> window = windowByTeacher.get(symbol);
            final Teacher teacher = teachers.get(symbol);
            int available = days * window.size();
            if (teacher != null) {
                available -= (int) teacher.getTeacher_non_working_hours().stream()
                        .filter(h -> h.getSchoolHour() != null && window.contains(h.getSchoolHour()))
                        .count();
            }
            if (hours > available) {
                problems.add("Teacher " + symbol + " has " + hours + " hours but is only available for " + available);
            }
        });
        final int roomCapacity = days * TimetableManager.LAST_SCHOOL_HOUR;
        hoursByRoom.forEach((room, hours) -> {
            if (hours > roomCapacity) {
                problems.add("Room " + room + " is booked for " + hours + " hours, a week has " + roomCapacity);
            }
        });
        return problems;
    }

    /** The instances placed from the old ClassSubjects go with them, they would point at deleted rows. */
    private static void removeClassSubjects(final SchoolClass schoolClass) {
        final List<ClassSubject> existing = ClassSubject.getAllByClassName(schoolClass.getClassName());
        if (existing.isEmpty()) {
            return;
        }
        ClassSubjectInstance.delete("classSubject in ?1", existing);
        existing.forEach(cs -> cs.delete());
    }

    private static Room newRoom(final String code) {
        final Room room = new Room();
        room.setRoomName(code);
        room.setNameShort(code);
        room.setRoomNumber(code.matches("\\d{1,4}") ? Short.parseShort(code) : 0);
        room.setRoomTypes(new ArrayList<>());
        return room;
    }

    public static MappedGpu map(final List<List<String>> subjectRows, final List<List<String>> lessonRows,
            final LocalDate requestedDate) {
        final Map<String, GpuSubject> subjectBySymbol = new LinkedHashMap<>();
        for (final List<String> row : subjectRows) {
            final String symbol = column(row, SUBJECT_SYMBOL);
            if (!symbol.isEmpty()) {
                subjectBySymbol.put(symbol, new GpuSubject(symbol, column(row, SUBJECT_NAME),
                        column(row, SUBJECT_STATISTICS), column(row, SUBJECT_LOAD_GROUP),
                        column(row, SUBJECT_ALIAS), toColor(column(row, SUBJECT_BACKGROUND), symbol)));
            }
        }

        final LocalDate referenceDate = requestedDate != null ? requestedDate
                : lessonRows.stream()
                        .map(row -> column(row, LESSON_FROM))
                        .filter(s -> !s.isEmpty())
                        .map(s -> LocalDate.parse(s, GPU_DATE))
                        .min(LocalDate::compareTo)
                        .orElse(LocalDate.now());

        final List<String> warnings = new ArrayList<>();
        final Map<String, Integer> skipped = new TreeMap<>();
        final Set<String> rooms = new LinkedHashSet<>();
        final Map<String, Map<String, Integer>> homeRoomCounts = new LinkedHashMap<>();
        final Map<String, List<List<String>>> rowsByLesson = new LinkedHashMap<>();
        for (final List<String> row : lessonRows) {
            rowsByLesson.computeIfAbsent(column(row, LESSON_NUMBER), n -> new ArrayList<>()).add(row);
            addIfPresent(rooms, column(row, LESSON_ROOM));
            addIfPresent(rooms, column(row, LESSON_HOME_ROOM));
            final String className = column(row, LESSON_CLASS);
            final String homeRoom = column(row, LESSON_HOME_ROOM);
            if (!className.isEmpty() && !homeRoom.isEmpty()) {
                homeRoomCounts.computeIfAbsent(className, c -> new LinkedHashMap<>()).merge(homeRoom, 1, Integer::sum);
            }
        }

        int lessons = 0;
        int coupledLessons = 0;
        int parallelLessons = 0;
        final Map<String, GpuSubject> usedSubjects = new LinkedHashMap<>();
        final List<GpuClassSubject> classSubjects = new ArrayList<>();
        final Map<String, List<GpuClassSubject>> lessonsByClass = new LinkedHashMap<>();

        for (final Map.Entry<String, List<List<String>>> lesson : rowsByLesson.entrySet()) {
            final List<List<String>> kept = new ArrayList<>();
            String skipReason = null;
            for (final List<String> row : lesson.getValue()) {
                final String reason = skipReason(row, subjectBySymbol, referenceDate);
                if (reason == null) {
                    kept.add(row);
                } else if (skipReason == null) {
                    skipReason = reason;
                }
            }

            final Set<String> teachers = new LinkedHashSet<>();
            final Set<String> subjects = new LinkedHashSet<>();
            final Set<String> fixedRooms = new LinkedHashSet<>();
            final Map<String, Integer> hoursByClass = new LinkedHashMap<>();
            for (final List<String> row : kept) {
                addIfPresent(teachers, column(row, LESSON_TEACHER));
                addIfPresent(fixedRooms, column(row, LESSON_ROOM));
                final String className = column(row, LESSON_CLASS);
                if (!className.isEmpty()) {
                    subjects.add(column(row, LESSON_SUBJECT));
                    // only the first teacher's row counts the hours for the class, the others carry 0
                    hoursByClass.merge(className, toInt(column(row, LESSON_CLASS_HOURS)), Math::max);
                }
            }

            if (hoursByClass.isEmpty()) {
                skipped.merge(kept.isEmpty() && skipReason != null ? skipReason : SKIP_NO_CLASS, 1, Integer::sum);
                continue;
            }

            // a coupled lesson is one lesson, so every class gets the same hours
            int hours = hoursByClass.values().stream().max(Integer::compare).orElse(0);
            if (hours == 0) {
                hours = toInt(column(kept.get(0), LESSON_HOURS));
            }
            if (hours == 0) {
                continue;
            }
            if (hoursByClass.values().stream().filter(h -> h != 0).distinct().count() > 1) {
                warnings.add("Lesson " + lesson.getKey() + " has different hours per class, all get " + hours);
            }

            lessons++;
            if (hoursByClass.size() > 1) {
                coupledLessons++;
            }
            final String parallelGroup = parallelGroupOf(subjects, subjectBySymbol);
            if (parallelGroup != null) {
                parallelLessons++;
            }

            final GpuSubject subject = subjectOf(subjects, subjectBySymbol);
            usedSubjects.putIfAbsent(subject.symbol(), subject);
            final boolean evening = hoursByClass.keySet().stream().anyMatch(GpuImporter::isEveningClass);
            final String blockSizes = blockSizesFor(subjects, hours, subjectBySymbol,
                    evening ? SchoolClass.EVENING_LAST_HOUR - SchoolClass.EVENING_FIRST_HOUR + 1 : MAX_WORKSHOP_BLOCK);

            for (final String className : hoursByClass.keySet()) {
                final GpuClassSubject classSubject = new GpuClassSubject(className, subject.symbol(), hours,
                        List.copyOf(teachers), "GPU-" + lesson.getKey(), parallelGroup, blockSizes,
                        List.copyOf(fixedRooms));
                classSubjects.add(classSubject);
                lessonsByClass.computeIfAbsent(className, c -> new ArrayList<>()).add(classSubject);
            }
        }

        final List<GpuClass> classes = new ArrayList<>();
        for (final Map.Entry<String, List<GpuClassSubject>> entry : lessonsByClass.entrySet()) {
            final String className = entry.getKey();
            final boolean evening = isEveningClass(className);
            final GpuClass schoolClass = new GpuClass(className, mostCommon(homeRoomCounts.get(className)),
                    evening ? SchoolClass.EVENING_FIRST_HOUR : SchoolClass.DAY_FIRST_HOUR,
                    evening ? SchoolClass.EVENING_LAST_HOUR : SchoolClass.DAY_LAST_HOUR);
            classes.add(schoolClass);

            // lessons of one parallel group can all run at once, so they need only as
            // many hours as the longest of them
            int classHours = 0;
            final Map<String, Integer> parallelHours = new HashMap<>();
            for (final GpuClassSubject cs : entry.getValue()) {
                if (cs.parallelGroup() == null) {
                    classHours += cs.weeklyHours();
                } else {
                    parallelHours.merge(cs.parallelGroup(), cs.weeklyHours(), Math::max);
                }
            }
            classHours += parallelHours.values().stream().mapToInt(Integer::intValue).sum();
            final int capacity = SchoolDays.schedulableDays().length
                    * (schoolClass.lastHour() - schoolClass.firstHour() + 1);
            if (classHours > capacity) {
                warnings.add("Class " + className + " has " + classHours + " weekly hours, more than the "
                        + capacity + " its week can hold");
            }
        }

        return new MappedGpu(referenceDate, new ArrayList<>(usedSubjects.values()), rooms, classes, classSubjects,
                lessons, coupledLessons, parallelLessons, skipped, warnings);
    }

    static boolean isEveningClass(final String className) {
        return EVENING_CLASS.matcher(className).matches();
    }

    /**
     * How a lesson's weekly hours are cut, as ClassSubject.blockSizes:
     * workshops (teaching load group L4) as one block, split only when longer
     * than a working day; languages and maths (SPREAD_ALIASES, but not their
     * labs) as single hours to be spread over the week; everything else as
     * doubles, plus a single for an odd hour.
     */
    public static String blockSizesFor(final Set<String> symbols, final int hours, final Map<String, GpuSubject> subjects,
            final int maxBlock) {
        final List<Integer> blocks = new ArrayList<>();
        final List<GpuSubject> known = symbols.stream().map(subjects::get).filter(s -> s != null).toList();
        final boolean workshop = known.stream().anyMatch(s -> WORKSHOP_LOAD_GROUP.equals(s.loadGroup()));
        final boolean spread = !known.isEmpty() && known.stream()
                .allMatch(s -> SPREAD_ALIASES.contains(s.alias()) && !s.name().toLowerCase().contains("lab"));

        if (workshop) {
            final int count = (hours + maxBlock - 1) / maxBlock;
            for (int i = 0; i < count; i++) {
                // as even as possible, the longer blocks first
                blocks.add(hours / count + (i < hours % count ? 1 : 0));
            }
        } else if (spread) {
            for (int i = 0; i < hours; i++) {
                blocks.add(1);
            }
        } else {
            for (int i = 0; i < hours / 2; i++) {
                blocks.add(2);
            }
            if (hours % 2 == 1) {
                blocks.add(1);
            }
        }
        return blocks.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private static String skipReason(final List<String> row, final Map<String, GpuSubject> subjects,
            final LocalDate referenceDate) {
        if (column(row, LESSON_FLAGS).contains("J")) {
            return SKIP_YEARLY;
        }
        final GpuSubject subject = subjects.get(column(row, LESSON_SUBJECT));
        final String statistics = subject == null ? "" : subject.statistics();
        if (statistics.equals("F")) {
            return SKIP_ELECTIVE;
        }
        if (statistics.equals("V") || statistics.equals("K")) {
            return SKIP_ADMINISTRATIVE;
        }
        final String className = column(row, LESSON_CLASS);
        if (!className.isEmpty() && !Character.isDigit(className.charAt(0))) {
            return SKIP_PSEUDO_CLASS;
        }
        final String from = column(row, LESSON_FROM);
        final String to = column(row, LESSON_TO);
        if ((!from.isEmpty() && referenceDate.isBefore(LocalDate.parse(from, GPU_DATE)))
                || (!to.isEmpty() && referenceDate.isAfter(LocalDate.parse(to, GPU_DATE)))) {
            return SKIP_INACTIVE;
        }
        return null;
    }

    /** The parallel group of a lesson when all its subjects belong to the same one. */
    static String parallelGroupOf(final Set<String> symbols, final Map<String, GpuSubject> subjects) {
        String found = null;
        for (final String symbol : symbols) {
            final String group = parallelGroupOf(symbol, subjects.get(symbol));
            if (group == null || (found != null && !found.equals(group))) {
                return null;
            }
            found = group;
        }
        return found;
    }

    private static String parallelGroupOf(final String symbol, final GpuSubject subject) {
        // 0RE, 0RK, 0RI, 0ROR, ... but not 0REC (Recht) or 0RST
        if (symbol.equals("0ETH") || (symbol.startsWith("0R") && subject != null
                && subject.name().toLowerCase().contains("relig"))) {
            return RELIGION;
        }
        if (symbol.equals("0BSPK") || symbol.equals("0BSPM")) {
            return SPORTS;
        }
        return null;
    }

    /** Several subjects coupled in one lesson are taught in parallel and shown as one combined subject. */
    private static GpuSubject subjectOf(final Set<String> symbols, final Map<String, GpuSubject> subjects) {
        final List<GpuSubject> parts = symbols.stream()
                .map(s -> subjects.getOrDefault(s, new GpuSubject(s, s, "", "", "", toColor("", s))))
                .toList();
        if (parts.size() == 1) {
            return parts.get(0);
        }
        final String symbol = parts.stream().map(GpuSubject::symbol).collect(Collectors.joining("/"));
        final String name = parts.stream().map(GpuSubject::name).collect(Collectors.joining(" / "));
        return new GpuSubject(symbol, name, "", parts.get(0).loadGroup(), parts.get(0).alias(), parts.get(0).color());
    }

    /** Untis stores colors as Windows COLORREF, 0x00BBGGRR; subjects without one get a stable pastel. */
    static RgbColor toColor(final String colorRef, final String symbol) {
        if (!colorRef.isEmpty()) {
            final int value = Integer.parseInt(colorRef);
            return new RgbColor(value & 0xFF, (value >> 8) & 0xFF, (value >> 16) & 0xFF);
        }
        final int hash = symbol.hashCode();
        return new RgbColor(128 + (hash & 0x7F), 128 + ((hash >> 8) & 0x7F), 128 + ((hash >> 16) & 0x7F));
    }

    private static String mostCommon(final Map<String, Integer> counts) {
        if (counts == null) {
            return null;
        }
        return counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static void addIfPresent(final Set<String> set, final String value) {
        if (!value.isEmpty()) {
            set.add(value);
        }
    }

    private static int toInt(final String value) {
        return value.isEmpty() ? 0 : Integer.parseInt(value);
    }

    private static String column(final List<String> row, final int index) {
        return index < row.size() ? row.get(index) : "";
    }

    /** GPU files are Latin-1, one record per line, ';' separated, strings in '"' with '""' as escape. */
    public static List<List<String>> parse(final byte[] bytes) {
        final List<List<String>> rows = new ArrayList<>();
        for (final String line : new String(bytes, StandardCharsets.ISO_8859_1).split("\r?\n")) {
            if (!line.isBlank()) {
                rows.add(parseLine(line));
            }
        }
        return rows;
    }

    static List<String> parseLine(final String line) {
        final List<String> fields = new ArrayList<>();
        final StringBuilder field = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < line.length(); i++) {
            final char c = line.charAt(i);
            if (quoted) {
                if (c != '"') {
                    field.append(c);
                } else if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    field.append('"');
                    i++;
                } else {
                    quoted = false;
                }
            } else if (c == '"') {
                quoted = true;
            } else if (c == ';') {
                fields.add(field.toString().trim());
                field.setLength(0);
            } else {
                field.append(c);
            }
        }
        fields.add(field.toString().trim());
        return fields;
    }
}
