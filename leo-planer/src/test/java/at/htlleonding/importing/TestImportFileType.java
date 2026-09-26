package at.htlleonding.importing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import at.htlleonding.leoplaner.data.ImportFileType;

// All samples are made up: the real school files are personal data and never go into src/test
public class TestImportFileType {

    // same shape as GPU006: quoted symbol first, 23 columns, Latin-1 umlaut
    static final String GPU_SUBJECTS = """
            "D";"Deutsch Übungen";;"x07";;;;;;;;;;"L1";;;;;16777215;;"D";;
            "AM";"Angewandte Mathematik";;;;;;;;;;;;"L1";;;;;16777215;;"AM";;
            """;

    // same shape as GPU002: lesson number first, 47 columns
    static final String GPU_LESSONS = lessonLine(1, "1AHIF", "ABC", "D") + lessonLine(2, "1AHIF", "XYZ", "AM");

    static final String SQL_EXPORT = """
            USE [TimetableDb]
            GO
            CREATE TABLE [dbo].[Teachers](
            INSERT [dbo].[Teachers] ([Id], [Forename], [Surname]) VALUES (N'TR_ABC', N'Anna', N'Beispiel')
            """;

    static final String WISHES = """
            { "conventions": ["made up"], "wishes": [] }
            """;

    static String lessonLine(final int number, final String schoolClass, final String teacher, final String subject) {
        final String[] fields = new String[47];
        java.util.Arrays.fill(fields, "");
        fields[0] = String.valueOf(number);
        fields[1] = "2";
        fields[4] = '"' + schoolClass + '"';
        fields[5] = '"' + teacher + '"';
        fields[6] = '"' + subject + '"';
        return String.join(";", fields) + "\r\n";
    }

    static byte[] utf16WithBom(final String text) {
        final byte[] body = text.getBytes(StandardCharsets.UTF_16LE);
        final byte[] bytes = new byte[body.length + 2];
        bytes[0] = (byte) 0xFF;
        bytes[1] = (byte) 0xFE;
        System.arraycopy(body, 0, bytes, 2, body.length);
        return bytes;
    }

    static byte[] excel() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            workbook.createSheet("Subjects");
            workbook.write(out);
            return out.toByteArray();
        }
    }

    @Test
    public void recognizesExcel() throws Exception {
        assertEquals(ImportFileType.EXCEL, ImportFileType.detect(excel()));
    }

    @Test
    public void recognizesSqlExportAsUtf16AndUtf8() {
        assertEquals(ImportFileType.TIMETABLE_EXPORT, ImportFileType.detect(utf16WithBom(SQL_EXPORT)));
        assertEquals(ImportFileType.TIMETABLE_EXPORT,
                ImportFileType.detect(SQL_EXPORT.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    public void recognizesWishes() {
        assertEquals(ImportFileType.TEACHER_WISHES, ImportFileType.detect(WISHES.getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    public void recognizesGpuSubjectsInLatin1() {
        assertEquals(ImportFileType.GPU_SUBJECTS,
                ImportFileType.detect(GPU_SUBJECTS.getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    public void recognizesGpuLessons() {
        assertEquals(ImportFileType.GPU_LESSONS,
                ImportFileType.detect(GPU_LESSONS.getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    public void unknownFiles() {
        assertEquals(ImportFileType.UNKNOWN, ImportFileType.detect(new byte[0]));
        assertEquals(ImportFileType.UNKNOWN, ImportFileType.detect("hello".getBytes(StandardCharsets.UTF_8)));
        // a JSON without wishes, and a short ;-separated CSV like the demo data
        assertEquals(ImportFileType.UNKNOWN, ImportFileType.detect("{\"a\": 1}".getBytes(StandardCharsets.UTF_8)));
        assertEquals(ImportFileType.UNKNOWN,
                ImportFileType.detect("1;Anna;Beispiel\n2;Bert;Muster\n".getBytes(StandardCharsets.UTF_8)));
        // one line that isn't a lesson makes the whole file unknown
        assertEquals(ImportFileType.UNKNOWN,
                ImportFileType.detect((GPU_LESSONS + "garbage\n").getBytes(StandardCharsets.ISO_8859_1)));
    }

    @Test
    public void realFilesAreRecognized() throws Exception {
        // the real files only exist on the developers' machines, never in git
        final Path sql = Path.of("src/files/TimetableExportScriptFinal.sql");
        assumeTrue(Files.exists(sql), "real school data not present");

        assertEquals(ImportFileType.TIMETABLE_EXPORT, ImportFileType.detect(Files.readAllBytes(sql)));
        assertEquals(ImportFileType.GPU_SUBJECTS, ImportFileType.detect(Files.readAllBytes(Path.of("src/files/GPU006.TXT"))));
        assertEquals(ImportFileType.GPU_LESSONS, ImportFileType.detect(Files.readAllBytes(Path.of("src/files/GPU002db.TXT"))));
        assertEquals(ImportFileType.TEACHER_WISHES,
                ImportFileType.detect(Files.readAllBytes(Path.of("src/files/teacherWishes.json"))));
    }
}
