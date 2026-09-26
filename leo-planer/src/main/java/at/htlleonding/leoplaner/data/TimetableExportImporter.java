package at.htlleonding.leoplaner.data;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

import at.htlleonding.leoplaner.dto.TimetableExportImportResultDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Imports the teacher data of the SSMS "Generate Scripts" export of the old
 * TimetableDb (Teachers, Reservations, ReservationReasons, TeacherPreferences).
 *
 * The free-text wishes are never interpreted here: they were translated once
 * into teacherWishes.json and are only looked up by teacher and text hash, so
 * a wish whose text changed is reported instead of guessed. The wishes are
 * optional: without them every wish is reported as unmapped, the blocked
 * hours from the reservations are imported either way.
 */
@ApplicationScoped
public class TimetableExportImporter {

    // only read by the dev shortcut run/importSchoolData and the tests, uploads bring their own copy
    public static final String WISHES_PATH = "src/files/teacherWishes.json";

    private static final String TEACHER_PREFIX = "TR_";
    private static final Set<String> NON_WORKING_ALIASES = Set.of("F", "B", "M", "MA");
    private static final Set<String> NON_PREFERRED_ALIASES = Set.of("MF");

    @Inject
    DataRepository dataRepository;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WishFile(List<Wish> wishes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Wish(String teacherId, String textHash, String note, List<WishDay> nonPreferred) {
    }

    public record WishDay(SchoolDays day, List<Integer> hours) {
    }

    /** A teacher as described by the export, before it touches the database. */
    public record ImportedTeacher(String nameSymbol, String teacherName, String wishText,
            List<TeacherNonWorkingHours> nonWorking, List<TeacherNonPreferredHours> nonPreferred) {
    }

    public record MappedExport(List<ImportedTeacher> teachers, int skippedReservations,
            List<String> unmappedWishes, List<String> warnings) {
    }

    /** Reads the wishes out of a teacherWishes.json. */
    public static List<Wish> readWishes(final byte[] json) throws IOException {
        final WishFile wishFile = new ObjectMapper().readValue(json, WishFile.class);
        return wishFile.wishes() == null ? List.of() : wishFile.wishes();
    }

    /** wishes may be empty, then every wish of the export is reported as unmapped. */
    @Transactional
    public TimetableExportImportResultDTO importExport(final byte[] sqlBytes, final List<Wish> wishes) {
        final MappedExport mapped = map(parse(decode(sqlBytes)), wishes);

        int created = 0;
        int updated = 0;
        int nonWorking = 0;
        int nonPreferred = 0;
        for (final ImportedTeacher imported : mapped.teachers()) {
            Teacher teacher = dataRepository.getTeacherByNameSymbol(imported.nameSymbol());
            final boolean isNew = teacher == null;
            if (isNew) {
                teacher = new Teacher();
                teacher.setNameSymbol(imported.nameSymbol());
            }
            teacher.setTeacherName(imported.teacherName());
            teacher.setWishText(imported.wishText());
            // replace, not merge, so importing the same export twice is idempotent
            teacher.getTeacher_non_working_hours().clear();
            teacher.getTeacher_non_working_hours().addAll(imported.nonWorking());
            teacher.getTeacher_non_preferred_hours().clear();
            teacher.getTeacher_non_preferred_hours().addAll(imported.nonPreferred());

            if (isNew) {
                dataRepository.addTeacher(teacher);
                created++;
            } else {
                updated++;
            }
            nonWorking += imported.nonWorking().size();
            nonPreferred += imported.nonPreferred().size();
        }

        return new TimetableExportImportResultDTO(created, updated, nonWorking, nonPreferred,
                mapped.skippedReservations(), mapped.unmappedWishes(), mapped.warnings());
    }

    public static MappedExport map(final Map<String, List<Map<String, String>>> tables, final List<Wish> wishes) {
        final List<String> warnings = new ArrayList<>();
        final List<String> unmappedWishes = new ArrayList<>();
        int skipped = 0;

        final Map<String, ImportedTeacher> teachers = new LinkedHashMap<>();
        for (final Map<String, String> row : tables.getOrDefault("Teachers", List.of())) {
            final String id = row.get("Id");
            final String name = (nullToEmpty(row.get("Forename")) + " " + nullToEmpty(row.get("Surname"))).trim();
            teachers.put(id, new ImportedTeacher(stripPrefix(id), name, null, new ArrayList<>(), new ArrayList<>()));
        }

        final Map<String, String> aliasByReasonId = new HashMap<>();
        for (final Map<String, String> row : tables.getOrDefault("ReservationReasons", List.of())) {
            aliasByReasonId.put(row.get("Id"), row.get("Alias"));
        }

        for (final Map<String, String> row : tables.getOrDefault("Reservations", List.of())) {
            final ImportedTeacher teacher = teachers.get(row.get("TargetId"));
            final String alias = aliasByReasonId.get(row.get("ReasonId"));
            final SchoolDays day = toDay(Integer.parseInt(row.get("Day")));
            // the export counts periods from 2, LeoPlaner's first school hour is 1
            final int hour = Integer.parseInt(row.get("Period")) - 1;
            if (teacher == null || day == null || hour < 1 || hour > TimetableManager.LAST_SCHOOL_HOUR) {
                skipped++;
                continue;
            }

            if (NON_WORKING_ALIASES.contains(alias)) {
                final TeacherNonWorkingHours nwh = new TeacherNonWorkingHours();
                nwh.setDay(day);
                nwh.setSchoolHour(hour);
                addIfAbsent(teacher.nonWorking(), nwh);
            } else if (NON_PREFERRED_ALIASES.contains(alias)) {
                addNonPreferred(teacher, day, hour);
            } else {
                skipped++;
            }
        }

        final Map<String, Wish> wishByTeacher = new HashMap<>();
        for (final Wish wish : wishes) {
            wishByTeacher.put(wish.teacherId(), wish);
        }

        for (final Map<String, String> row : tables.getOrDefault("TeacherPreferences", List.of())) {
            final String teacherId = row.get("TeacherId");
            final String text = normalizeWishText(row.get("Text"));
            if (text == null || text.isEmpty()) {
                continue;
            }

            ImportedTeacher teacher = teachers.get(teacherId);
            if (teacher == null) {
                warnings.add("Wish for unknown teacher " + teacherId + " skipped");
                continue;
            }
            teacher = new ImportedTeacher(teacher.nameSymbol(), teacher.teacherName(), text,
                    teacher.nonWorking(), teacher.nonPreferred());
            teachers.put(teacherId, teacher);

            final Wish wish = wishByTeacher.get(teacherId);
            if (wish == null || !hash(text).equals(wish.textHash())) {
                unmappedWishes.add(teacherId);
                continue;
            }
            for (final WishDay wishDay : wish.nonPreferred()) {
                for (final Integer hour : wishDay.hours()) {
                    addNonPreferred(teacher, wishDay.day(), hour);
                }
            }
        }

        return new MappedExport(new ArrayList<>(teachers.values()), skipped, unmappedWishes, warnings);
    }

    private static void addNonPreferred(final ImportedTeacher teacher, final SchoolDays day, final int hour) {
        final TeacherNonPreferredHours nph = new TeacherNonPreferredHours();
        nph.setDay(day);
        nph.setSchoolHour(hour);
        // an hour the teacher never works is already the stronger constraint
        if (!containsHour(teacher.nonWorking(), nph)) {
            addIfAbsent(teacher.nonPreferred(), nph);
        }
    }

    private static <T extends HoursPeriod> void addIfAbsent(final List<T> list, final T hour) {
        if (!containsHour(list, hour)) {
            list.add(hour);
        }
    }

    private static boolean containsHour(final List<? extends HoursPeriod> list, final HoursPeriod hour) {
        return list.stream().anyMatch(e -> e.getDay() == hour.getDay()
                && e.getSchoolHour().equals(hour.getSchoolHour()));
    }

    private static SchoolDays toDay(final int exportDay) {
        final SchoolDays[] days = SchoolDays.schedulableDays();
        return exportDay >= 1 && exportDay <= days.length ? days[exportDay - 1] : null;
    }

    private static String stripPrefix(final String id) {
        return id.startsWith(TEACHER_PREFIX) ? id.substring(TEACHER_PREFIX.length()) : id;
    }

    private static String nullToEmpty(final String s) {
        return s == null ? "" : s;
    }

    public static String normalizeWishText(final String text) {
        return text == null ? null : text.replace("\r\n", "\n").trim();
    }

    public static String hash(final String text) {
        try {
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (final NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** SSMS writes scripts as UTF-16 with a BOM; anything without one is read as UTF-8. */
    public static String decode(final byte[] bytes) {
        if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xFE) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16LE);
        }
        if (bytes.length >= 2 && (bytes[0] & 0xFF) == 0xFE && (bytes[1] & 0xFF) == 0xFF) {
            return new String(bytes, 2, bytes.length - 2, StandardCharsets.UTF_16BE);
        }
        final String text = new String(bytes, StandardCharsets.UTF_8);
        return text.startsWith("﻿") ? text.substring(1) : text;
    }

    /**
     * Collects every "INSERT [dbo].[Table] ([Col], ...) VALUES (...)" of the script
     * as rows of column name to value, grouped by table. String values may span
     * several lines and escape quotes as ''; NULL becomes null.
     */
    public static Map<String, List<Map<String, String>>> parse(final String sql) {
        final String marker = "INSERT [dbo].[";
        final Map<String, List<Map<String, String>>> tables = new LinkedHashMap<>();

        int pos = 0;
        while ((pos = sql.indexOf(marker, pos)) != -1) {
            // "SET IDENTITY_INSERT [dbo].[X] ON" contains the marker too, only statements start a line
            final boolean startsLine = pos == 0 || sql.charAt(pos - 1) == '\n';
            pos += marker.length();
            if (!startsLine) {
                continue;
            }
            final int tableEnd = sql.indexOf(']', pos);
            final String table = sql.substring(pos, tableEnd);

            final int colsStart = sql.indexOf('(', tableEnd);
            final int colsEnd = sql.indexOf(')', colsStart);
            final List<String> columns = new ArrayList<>();
            for (final String col : sql.substring(colsStart + 1, colsEnd).split(",")) {
                columns.add(col.trim().replace("[", "").replace("]", ""));
            }

            final int valuesAt = sql.indexOf("VALUES", colsEnd);
            if (valuesAt == -1) {
                throw new IllegalArgumentException("INSERT into " + table + " without VALUES");
            }
            pos = sql.indexOf('(', valuesAt) + 1;

            final List<String> values = new ArrayList<>();
            while (true) {
                pos = skipWhitespace(sql, pos);
                final char c = sql.charAt(pos);
                if ((c == 'N' && sql.charAt(pos + 1) == '\'') || c == '\'') {
                    pos = sql.indexOf('\'', pos) + 1;
                    final StringBuilder value = new StringBuilder();
                    while (true) {
                        final char s = sql.charAt(pos++);
                        if (s == '\'') {
                            if (pos < sql.length() && sql.charAt(pos) == '\'') {
                                value.append('\'');
                                pos++;
                            } else {
                                break;
                            }
                        } else {
                            value.append(s);
                        }
                    }
                    values.add(value.toString());
                } else {
                    int end = pos;
                    while (sql.charAt(end) != ',' && sql.charAt(end) != ')') {
                        end++;
                    }
                    final String token = sql.substring(pos, end).trim();
                    values.add(token.equalsIgnoreCase("NULL") ? null : token);
                    pos = end;
                }

                pos = skipWhitespace(sql, pos);
                if (sql.charAt(pos) == ')') {
                    pos++;
                    break;
                }
                pos++; // the comma between two values
            }

            if (values.size() != columns.size()) {
                throw new IllegalArgumentException("INSERT into " + table + " has " + values.size()
                        + " values for " + columns.size() + " columns");
            }
            final Map<String, String> row = new HashMap<>();
            for (int i = 0; i < columns.size(); i++) {
                row.put(columns.get(i), values.get(i));
            }
            tables.computeIfAbsent(table, t -> new ArrayList<>()).add(row);
        }
        return tables;
    }

    private static int skipWhitespace(final String sql, int pos) {
        while (Character.isWhitespace(sql.charAt(pos))) {
            pos++;
        }
        return pos;
    }
}
