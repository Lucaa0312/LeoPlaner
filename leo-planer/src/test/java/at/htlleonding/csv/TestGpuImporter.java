package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.GpuImporter;
import at.htlleonding.leoplaner.data.GpuImporter.GpuClass;
import at.htlleonding.leoplaner.data.GpuImporter.GpuClassSubject;
import at.htlleonding.leoplaner.data.GpuImporter.GpuSubject;
import at.htlleonding.leoplaner.data.GpuImporter.MappedGpu;
import at.htlleonding.leoplaner.data.RgbColor;
import at.htlleonding.leoplaner.data.SchoolClass;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

public class TestGpuImporter {

    private static final String SUBJECTS = """
            "0AM";"Ang.Mathematik";;;;;;;;;;;;"L1";1.16700;;"B";0;255;;"AM";;
            "0D";"DEUTSCH";;;;;1;3;;1;;;;"L1";1.16700;;;;;;"D";;
            "1DBI";"Datenbanken Gr.1";;;;;;;;;;;;"L1";1.16700;;;;;;"DBI_1";;
            "1POSE";"Programmieren Gr.1";;;;;;;;;;;;"L1";1.16700;;;;;;"POS1";;
            "0RK";"RELIGION ROEM.KATH";;;;;1;2;;1;;;;"L3";1.05000;;;;;;"RK";;
            "0RI";"Religion Islam";;;;;;;;;;;;"L3";1.05000;;;;;;"RISL";;
            "0ETH";"Ethik";;;;;;;;;;;;"L3";1.05000;;;;;;"ETH";;
            "0REC";"RECHT HE";;;;;;;;;;;;"L3";1.05000;;;;;;"REC";;
            "AU_ARVR";"Augmented and Virtual Reality";"F";;;;;;;;;;;"L1";1.16700;;;;;;"POS1";;
            "4ORD";"ORDINARIAT";"V";;"Ia";;1;1;;1;;;;"L2";1.10500;;;;;;"ORD";;
            "DIRE";"Direktion";;;;;;;;;;;;"L1";1.16700;;;;;;"DIRE";;
            "1PMW4";"Prototypenbau";;;;;;;;;;;;"L4";0.91300;;;;;;"PMS_4";;
            """;

    private static final String LESSONS = """
            1;20;;20;;"KAIN";"DIRE";;;0;20.00000;;;;"20260914";"20270711";0.08600;"Direktor; behalten";;;;;;"n";;;;;;;;;;0;0;"20000";;;;2000000;20.00000;;;;;0;
            2;3;3;3;"1AHIF";"LUG";"0AM";"132";;0;0.00000;;;;"20260914";"20270711";0.00000;;;"132";;;;"n";;;;;;;;;;0;0;;;;;300000;3.00000;;;;;0;
            3;2;2;2;"1AHIF";"ANZD";"0D";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;"132";;;;"n";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            3;2;2;0;"1BHIF";"ANZD";"0D";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;"134";;;;"n";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            4;2;2;2;"1AHIF";"EISS";"1DBI";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"aBn";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            4;2;0;2;"1AHIF";"GEHR";"1POSE";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"aBn";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            5;2;2;2;"1AHIF";"ROCKH";"0RK";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"n";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            6;1;1;1;"1AHIF";"MLIVA";"0RI";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"Bn";;;;;;;;;;0;0;;;;;100000;1.00000;;;;;0;
            7;2;2;2;"1AHIF";"MATZ";"0ETH";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"n";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            8;1;1;1;"1AHIF";"KEPL";"0REC";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"n";;;;;;;;;;0;0;;;;;100000;1.00000;;;;;0;
            9;2;2;2;"1AHIF";"HASLM";"AU_ARVR";;;0;0.00000;;;;"20261005";"20270627";0.00000;;;;;;;"n";;;;;;;;;;0;0;;;;;200000;2.00000;;;;;0;
            10;1;1;1;"1AHIF";"AITEN";"4ORD";"132";;0;0.00000;;;;"20260914";"20270711";0.00000;"behalten";;"132";;;;"n";;;;;;;;;;0;0;;;;;100000;1.00000;;;;;0;
            11;72;72;72;"1AHIF";"NNLB";"0AM";;;0;2.33400;;;;"20260914";"20270711";0.00019;;;;;;;"aBJn";;;;;;;;;;0;0;;;;;0;0.00000;;;72;;0;
            12;5;5;5;"1AHIF";"DULL";"1PMW4";"U08A";;9;5.00000;;;;"20260914";"20261122";0.02150;;;;;;;"BnX";;;;;;;;;;0;0;;;;;500000;5.00000;;;;;0;
            13;5;5;5;"1AHIF";"HASL";"1PMW4";"U89";;9;5.00000;;;;"20261123";"20270711";0.02150;;;;;;;"BnX";;;;;;;;;;0;0;;;;;500000;5.00000;;;;;0;
            14;1;1;1;"FS1";"WAG";"0D";;;0;0.00000;;;;"20260914";"20270711";0.00000;;;;;;;"n";;;;;;;;;;0;0;;;;;100000;1.00000;;;;;0;
            15;3;3;3;"3ABIF";"REDER";"0AM";"153";;0;0.00000;;;;"20260914";"20270711";0.00000;;;"153";;;;"n";;;;;;;;;;0;0;;;;;300000;3.00000;;;;;0;
            """;

    private static MappedGpu map(final LocalDate date) {
        return GpuImporter.map(
                GpuImporter.parse(SUBJECTS.getBytes(StandardCharsets.ISO_8859_1)),
                GpuImporter.parse(LESSONS.getBytes(StandardCharsets.ISO_8859_1)),
                date);
    }

    private static Map<String, GpuClassSubject> of(final MappedGpu mapped, final String className) {
        return mapped.classSubjects().stream()
                .filter(cs -> cs.className().equals(className))
                .collect(Collectors.toMap(GpuClassSubject::subjectSymbol, cs -> cs));
    }

    @Test
    public void parsesQuotedFieldsWithSeparators() {
        final List<List<String>> rows = GpuImporter.parse(
                "1;\"Direktor; behalten\";\"say \"\"hi\"\"\";;\r\n\r\n2;x\r\n".getBytes(StandardCharsets.ISO_8859_1));

        assertEquals(2, rows.size());
        assertEquals(List.of("1", "Direktor; behalten", "say \"hi\"", "", ""), rows.get(0));
    }

    @Test
    public void readsLatin1Names() {
        final byte[] bytes = "\"0BSPM\";\"Bewegung Sport Mädchen\";".getBytes(StandardCharsets.ISO_8859_1);

        assertEquals("Bewegung Sport Mädchen", GpuImporter.parse(bytes).get(0).get(1));
    }

    @Test
    public void keepsOnlySchedulableLessons() {
        final MappedGpu mapped = map(null);

        assertEquals(LocalDate.of(2026, 9, 14), mapped.referenceDate());
        assertEquals(Map.of(
                GpuImporter.SKIP_NO_CLASS, 1,
                GpuImporter.SKIP_YEARLY, 1,
                GpuImporter.SKIP_ELECTIVE, 1,
                GpuImporter.SKIP_ADMINISTRATIVE, 1,
                GpuImporter.SKIP_PSEUDO_CLASS, 1,
                GpuImporter.SKIP_INACTIVE, 1), mapped.skippedLessons());
        assertTrue(mapped.classes().stream().noneMatch(c -> c.name().equals("FS1")));
    }

    @Test
    public void couplesTheClassesOfOneLesson() {
        final MappedGpu mapped = map(null);
        final GpuClassSubject a = of(mapped, "1AHIF").get("0D");
        final GpuClassSubject b = of(mapped, "1BHIF").get("0D");

        assertEquals(1, mapped.coupledLessons());
        assertEquals("GPU-3", a.couplingKey());
        assertEquals(a.couplingKey(), b.couplingKey());
        assertEquals(2, b.weeklyHours());
        assertEquals(List.of("ANZD"), b.teacherSymbols());
        assertEquals("134", classNamed(mapped, "1BHIF").homeRoom());
    }

    @Test
    public void combinesSubjectsCoupledInOneLesson() {
        final GpuClassSubject lab = of(map(null), "1AHIF").get("1DBI/1POSE");

        // the second teacher's row carries 0 class hours, the lesson still only takes 2
        assertEquals(2, lab.weeklyHours());
        assertEquals(List.of("EISS", "GEHR"), lab.teacherSymbols());
    }

    @Test
    public void religionLessonsStaySeparateButMayRunInParallel() {
        final MappedGpu mapped = map(null);
        final Map<String, GpuClassSubject> subjects = of(mapped, "1AHIF");

        // each religion is its own lesson with its own teacher, never merged
        assertEquals(List.of("ROCKH"), subjects.get("0RK").teacherSymbols());
        assertEquals(List.of("MLIVA"), subjects.get("0RI").teacherSymbols());
        assertEquals(GpuImporter.RELIGION, subjects.get("0RK").parallelGroup());
        assertEquals(GpuImporter.RELIGION, subjects.get("0ETH").parallelGroup());
        assertNull(subjects.get("0REC").parallelGroup());
        assertEquals(3, mapped.parallelLessons());
    }

    @Test
    public void cutsWorkshopsIntoOneBlockLabsIntoDoublesTheoryIntoSingles() {
        final Map<String, GpuClassSubject> subjects = of(map(null), "1AHIF");

        assertEquals("5", subjects.get("1PMW4").blockSizes());
        assertEquals("2", subjects.get("1DBI/1POSE").blockSizes());
        assertEquals("1,1,1", subjects.get("0AM").blockSizes());
    }

    @Test
    public void splitsWorkshopsLongerThanADay() {
        final Map<String, GpuSubject> subjects = Map.of("1PMW4",
                new GpuSubject("1PMW4", "Prototypenbau", "", "L4", new RgbColor(0, 0, 0)));

        assertEquals("5,5", GpuImporter.blockSizesFor(Set.of("1PMW4"), 10, subjects, 8));
        assertEquals("2,2,1", GpuImporter.blockSizesFor(Set.of("1DBI"), 5, subjects, 8));
    }

    @Test
    public void keepsTheLessonRoomAsFixedRoom() {
        final Map<String, GpuClassSubject> subjects = of(map(null), "1AHIF");

        assertEquals(List.of("132"), subjects.get("0AM").fixedRooms());
        assertEquals(List.of(), subjects.get("0D").fixedRooms());
    }

    @Test
    public void eveningClassesAreTaughtInTheEvening() {
        final MappedGpu mapped = map(null);

        assertEquals(SchoolClass.EVENING_FIRST_HOUR, classNamed(mapped, "3ABIF").firstHour());
        assertEquals(SchoolClass.EVENING_LAST_HOUR, classNamed(mapped, "3ABIF").lastHour());
        assertEquals(SchoolClass.DAY_FIRST_HOUR, classNamed(mapped, "1AHIF").firstHour());
        assertEquals(SchoolClass.DAY_LAST_HOUR, classNamed(mapped, "1AHIF").lastHour());
    }

    @Test
    public void referenceDatePicksTheActiveRotation() {
        assertEquals(List.of("DULL"), of(map(null), "1AHIF").get("1PMW4").teacherSymbols());
        assertEquals(List.of("HASL"), of(map(LocalDate.of(2027, 1, 11)), "1AHIF").get("1PMW4").teacherSymbols());
    }

    @Test
    public void convertsColorRefToRgb() {
        final GpuSubject math = map(null).subjects().stream()
                .filter(s -> s.symbol().equals("0AM")).findFirst().orElseThrow();

        // COLORREF is 0x00BBGGRR, 255 is pure red
        assertEquals(new RgbColor(255, 0, 0), math.color());
    }

    @Test
    public void realExportFitsIntoAWeekAndCountsEveryLessonOnce() throws Exception {
        // the GPU exports are school data and not in the repository, so CI has no copy
        assumeTrue(Files.exists(Path.of(GpuImporter.SUBJECTS_PATH)) && Files.exists(Path.of(GpuImporter.LESSONS_PATH)),
                "GPU exports not present");
        final MappedGpu mapped = GpuImporter.map(
                GpuImporter.parse(Files.readAllBytes(Path.of(GpuImporter.SUBJECTS_PATH))),
                GpuImporter.parse(Files.readAllBytes(Path.of(GpuImporter.LESSONS_PATH))),
                null);

        assertTrue(mapped.warnings().stream().noneMatch(w -> w.contains("weekly hours")), mapped.warnings()::toString);

        // a coupled lesson is taught once, however many classes sit in it
        final Map<String, GpuClassSubject> lessons = new HashMap<>();
        mapped.classSubjects().forEach(cs -> lessons.putIfAbsent(cs.couplingKey(), cs));
        final Map<String, Integer> hoursByTeacher = new HashMap<>();
        lessons.values().forEach(cs -> cs.teacherSymbols()
                .forEach(t -> hoursByTeacher.merge(t, cs.weeklyHours(), Integer::sum)));

        assertEquals(17, hoursByTeacher.get("MLIVA"));
        assertEquals(36, hoursByTeacher.get("KLE"));
        assertTrue(hoursByTeacher.values().stream().allMatch(h -> h <= 50), hoursByTeacher::toString);
    }

    private static GpuClass classNamed(final MappedGpu mapped, final String name) {
        return mapped.classes().stream().filter(c -> c.name().equals(name)).findFirst().orElseThrow();
    }
}
