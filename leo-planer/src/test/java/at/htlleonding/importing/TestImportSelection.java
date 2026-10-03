package at.htlleonding.importing;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.junit.jupiter.api.Test;

import at.htlleonding.leoplaner.data.ImportFileType;
import at.htlleonding.leoplaner.data.ImportSelection;
import at.htlleonding.leoplaner.data.ImportSelection.Kind;
import at.htlleonding.leoplaner.data.ImportSelection.NamedFile;

public class TestImportSelection {

    static NamedFile sql(final String name) {
        return new NamedFile(name, TestImportFileType.utf16WithBom(TestImportFileType.SQL_EXPORT));
    }

    static NamedFile subjects(final String name) {
        return new NamedFile(name, TestImportFileType.GPU_SUBJECTS.getBytes(StandardCharsets.ISO_8859_1));
    }

    static NamedFile lessons(final String name) {
        return new NamedFile(name, TestImportFileType.GPU_LESSONS.getBytes(StandardCharsets.ISO_8859_1));
    }

    static NamedFile wishes(final String name) {
        return new NamedFile(name, TestImportFileType.WISHES.getBytes(StandardCharsets.UTF_8));
    }

    static NamedFile excel(final String name) throws Exception {
        return new NamedFile(name, TestImportFileType.excel());
    }

    @Test
    public void excelAlone() throws Exception {
        final ImportSelection selection = ImportSelection.check(List.of(excel("export.xlsx")));

        assertTrue(selection.isValid());
        assertEquals(Kind.EXCEL, selection.getKind());
    }

    @Test
    public void completeSchoolDataInAnyOrderAndWithAnyNames() {
        final ImportSelection selection = ImportSelection.check(List.of(
                lessons("a.txt"), wishes("b.txt"), sql("c.txt"), subjects("d.txt")));

        assertTrue(selection.isValid());
        assertEquals(Kind.SCHOOL_DATA, selection.getKind());
        assertEquals(ImportFileType.GPU_SUBJECTS, selection.getFiles().get(3).type());
    }

    @Test
    public void wishesAreOptional() {
        final ImportSelection selection = ImportSelection.check(List.of(
                sql("export.sql"), subjects("GPU006.TXT"), lessons("GPU002.TXT")));

        assertTrue(selection.isValid());
        assertNull(selection.content(ImportFileType.TEACHER_WISHES));
    }

    @Test
    public void missingFileIsNamedAndTheOthersStillRecognized() {
        final ImportSelection selection = ImportSelection.check(List.of(
                sql("export.sql"), subjects("GPU006.TXT")));

        assertFalse(selection.isValid());
        assertEquals("Für die Schuldaten fehlt noch: Unterricht (Untis GPU002). Bitte alle Dateien gemeinsam auswählen.",
                selection.getError());
        assertEquals(ImportFileType.TIMETABLE_EXPORT, selection.getFiles().get(0).type());
        assertEquals(ImportFileType.GPU_SUBJECTS, selection.getFiles().get(1).type());
    }

    @Test
    public void onlyTheWishesMissesEverythingElse() {
        final ImportSelection selection = ImportSelection.check(List.of(wishes("teacherWishes.json")));

        assertFalse(selection.isValid());
        assertTrue(selection.getError().contains("Lehrer (Stundenplan-Export .sql)"));
        assertTrue(selection.getError().contains("Fächer (Untis GPU006)"));
        assertTrue(selection.getError().contains("Unterricht (Untis GPU002)"));
    }

    @Test
    public void sameTypeTwice() {
        final ImportSelection selection = ImportSelection.check(List.of(
                sql("export.sql"), subjects("GPU006.TXT"), subjects("GPU006 (1).TXT"), lessons("GPU002.TXT")));

        assertFalse(selection.isValid());
        assertEquals("„GPU006.TXT“ und „GPU006 (1).TXT“ sind beide Fächer (Untis GPU006). "
                + "Bitte jede Datei nur einmal auswählen.", selection.getError());
    }

    @Test
    public void excelMixedWithSchoolData() throws Exception {
        final ImportSelection selection = ImportSelection.check(List.of(excel("export.xlsx"), subjects("GPU006.TXT")));

        assertFalse(selection.isValid());
        assertEquals("Bitte entweder die Excel-Datei oder die Schuldaten-Dateien auswählen, nicht beides gleichzeitig.",
                selection.getError());
    }

    @Test
    public void unknownFileIsNamed() {
        final ImportSelection selection = ImportSelection.check(List.of(
                sql("export.sql"), new NamedFile("notes.txt", "hello".getBytes(StandardCharsets.UTF_8))));

        assertFalse(selection.isValid());
        assertTrue(selection.getError().startsWith("Nicht erkannt: „notes.txt“."));
        assertEquals(ImportFileType.TIMETABLE_EXPORT, selection.getFiles().get(0).type());
    }

    @Test
    public void nothingSelected() {
        final ImportSelection selection = ImportSelection.check(List.of());

        assertFalse(selection.isValid());
        assertEquals("Keine Datei ausgewählt.", selection.getError());
    }
}
