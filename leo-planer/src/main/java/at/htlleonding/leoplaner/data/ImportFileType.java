package at.htlleonding.leoplaner.data;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * The kinds of files the import accepts. The type is always taken from the
 * content, never from the file name or the MIME type: browsers report .TXT and
 * .sql inconsistently and files get renamed.
 */
public enum ImportFileType {
    EXCEL("Excel-Datei (LeoPlaner-Export)"),
    TIMETABLE_EXPORT("Lehrer (Stundenplan-Export .sql)"),
    TEACHER_WISHES("Lehrerwünsche (.json)"),
    GPU_SUBJECTS("Fächer (Untis GPU006)"),
    GPU_LESSONS("Unterricht (Untis GPU002)"),
    UNKNOWN("nicht erkannt");

    private static final Pattern NUMBER = Pattern.compile("\\d+");

    // GPU006 has about 23 columns per line, GPU002 about 47; anything with far
    // fewer is some other ;-separated file
    private static final int MIN_GPU_SUBJECT_COLUMNS = 15;
    private static final int MIN_GPU_LESSON_COLUMNS = 24;

    private final String label;

    ImportFileType(final String label) {
        this.label = label;
    }

    /** What the user sees for this type, in German. */
    public String getLabel() {
        return label;
    }

    public static ImportFileType detect(final byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return UNKNOWN;
        }
        if (isExcel(bytes)) {
            return EXCEL;
        }

        // the SQL export is UTF-16 with a BOM, decode handles that and plain UTF-8
        final String text = TimetableExportImporter.decode(bytes);
        if (text.contains("[dbo].[Teachers]")) {
            return TIMETABLE_EXPORT;
        }
        if (isWishFile(text)) {
            return TEACHER_WISHES;
        }
        return detectGpu(bytes);
    }

    // .xlsx is a ZIP archive (PK\3\4), the old .xls an OLE2 compound file (D0 CF 11 E0)
    private static boolean isExcel(final byte[] b) {
        return startsWith(b, 0x50, 0x4B, 0x03, 0x04) || startsWith(b, 0xD0, 0xCF, 0x11, 0xE0);
    }

    private static boolean startsWith(final byte[] bytes, final int... prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if ((bytes[i] & 0xFF) != prefix[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean isWishFile(final String text) {
        if (!text.stripLeading().startsWith("{")) {
            return false;
        }
        try {
            final JsonNode wishes = new ObjectMapper().readTree(text).get("wishes");
            return wishes != null && wishes.isArray();
        } catch (final Exception e) {
            return false;
        }
    }

    // Every line of GPU002 starts with the lesson number, every line of GPU006
    // with the quoted subject symbol. All lines have to agree, one odd line
    // makes the file unknown instead of half imported.
    private static ImportFileType detectGpu(final byte[] bytes) {
        final String text = new String(bytes, StandardCharsets.ISO_8859_1);
        final List<String> lines = text.lines().filter(line -> !line.isBlank()).toList();
        if (lines.isEmpty()) {
            return UNKNOWN;
        }

        final boolean lessons = lines.stream().allMatch(line -> {
            final List<String> fields = GpuImporter.parseLine(line);
            return fields.size() >= MIN_GPU_LESSON_COLUMNS && NUMBER.matcher(fields.get(0)).matches();
        });
        if (lessons) {
            return GPU_LESSONS;
        }

        final boolean subjects = lines.stream().allMatch(line -> line.startsWith("\"")
                && GpuImporter.parseLine(line).size() >= MIN_GPU_SUBJECT_COLUMNS);
        return subjects ? GPU_SUBJECTS : UNKNOWN;
    }
}
