package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.data.TimetableExportImporter.ImportedTeacher;
import at.htlleonding.leoplaner.data.TimetableExportImporter.MappedExport;
import at.htlleonding.leoplaner.data.TimetableExportImporter.Wish;
import at.htlleonding.leoplaner.data.TimetableExportImporter.WishDay;
import at.htlleonding.leoplaner.data.TimetableExportImporter.WishFile;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class TestTimetableExportImporter {

    private static final String WISH = "Freitag frei, bitte\r\nkeine 'erste' Stunde";

    private static final String SNIPPET = """
            USE [TimetableDb]
            GO
            INSERT [dbo].[ReservationReasons] ([Id], [Description], [Alias], [IsDefault]) VALUES (1, N'frei', N'F', 0)
            INSERT [dbo].[ReservationReasons] ([Id], [Description], [Alias], [IsDefault]) VALUES (2, N'möglichst frei', N'MF', 0)
            INSERT [dbo].[ReservationReasons] ([Id], [Description], [Alias], [IsDefault]) VALUES (5, N'temporär', N'T', 1)
            INSERT [dbo].[Reservations] ([Id], [TargetId], [ReasonId], [Day], [Period]) VALUES (1, N'TR_ABC', 1, 1, 2)
            INSERT [dbo].[Reservations] ([Id], [TargetId], [ReasonId], [Day], [Period]) VALUES (2, N'TR_ABC', 1, 1, 2)
            INSERT [dbo].[Reservations] ([Id], [TargetId], [ReasonId], [Day], [Period]) VALUES (3, N'TR_ABC', 1, 3, 12)
            INSERT [dbo].[Reservations] ([Id], [TargetId], [ReasonId], [Day], [Period]) VALUES (4, N'TR_ABC', 5, 2, 3)
            INSERT [dbo].[Reservations] ([Id], [TargetId], [ReasonId], [Day], [Period]) VALUES (5, N'TR_ABC', 2, 2, 4)
            INSERT [dbo].[TeacherPreferences] ([TeacherId], [Text]) VALUES (N'TR_ABC', N'Freitag frei, bitte\r
            keine ''erste'' Stunde')
            INSERT [dbo].[TeacherPreferences] ([TeacherId], [Text]) VALUES (N'TR_XYZ', NULL)
            INSERT [dbo].[Teachers] ([Id], [Forename], [Surname], [Gender], [DepartmentId], [ClassDepartmentId]) VALUES (N'TR_ABC', N'Anna', N'Beispiel', N'F', N'DP_HIF', NULL)
            GO
            """;

    private static byte[] utf16WithBom(final String text) {
        final byte[] body = text.getBytes(StandardCharsets.UTF_16LE);
        final byte[] bytes = new byte[body.length + 2];
        bytes[0] = (byte) 0xFF;
        bytes[1] = (byte) 0xFE;
        System.arraycopy(body, 0, bytes, 2, body.length);
        return bytes;
    }

    @Test
    public void parsesUtf16ScriptWithMultiLineEscapedStrings() {
        final Map<String, List<Map<String, String>>> tables =
                TimetableExportImporter.parse(TimetableExportImporter.decode(utf16WithBom(SNIPPET)));

        assertEquals(5, tables.get("Reservations").size());
        assertEquals("möglichst frei", tables.get("ReservationReasons").get(1).get("Description"));
        assertEquals("Freitag frei, bitte\r\nkeine 'erste' Stunde", tables.get("TeacherPreferences").get(0).get("Text"));
        assertNull(tables.get("TeacherPreferences").get(1).get("Text"));
        assertNull(tables.get("Teachers").get(0).get("ClassDepartmentId"));
    }

    @Test
    public void mapsReservationsAndMatchingWish() {
        final String hash = TimetableExportImporter.hash(TimetableExportImporter.normalizeWishText(WISH));
        final Wish wish = new Wish("TR_ABC", hash, "",
                List.of(new WishDay(SchoolDays.FRIDAY, List.of(1, 2)), new WishDay(SchoolDays.MONDAY, List.of(1))));

        final MappedExport mapped = TimetableExportImporter.map(
                TimetableExportImporter.parse(SNIPPET), List.of(wish));

        final ImportedTeacher teacher = mapped.teachers().get(0);
        assertEquals("ABC", teacher.nameSymbol());
        assertEquals("Anna Beispiel", teacher.teacherName());
        assertEquals(TimetableExportImporter.normalizeWishText(WISH), teacher.wishText());

        // the duplicate row collapses, period 2 becomes hour 1
        assertEquals(1, teacher.nonWorking().size());
        assertEquals(SchoolDays.MONDAY, teacher.nonWorking().get(0).getDay());
        assertEquals(1, teacher.nonWorking().get(0).getSchoolHour());

        // MF Tuesday hour 3 + wish Friday 1,2; Monday 1 is already non-working
        assertEquals(3, teacher.nonPreferred().size());
        // period 12 lies outside the day, reason T is ignored
        assertEquals(2, mapped.skippedReservations());
        assertTrue(mapped.unmappedWishes().isEmpty());
    }

    @Test
    public void changedWishTextIsReportedInsteadOfApplied() {
        final Wish stale = new Wish("TR_ABC", TimetableExportImporter.hash("old text"), "",
                List.of(new WishDay(SchoolDays.FRIDAY, List.of(1))));

        final MappedExport mapped = TimetableExportImporter.map(
                TimetableExportImporter.parse(SNIPPET), List.of(stale));

        assertEquals(List.of("TR_ABC"), mapped.unmappedWishes());
        assertEquals(1, mapped.teachers().get(0).nonPreferred().size());
    }

    @Test
    public void realExportIsFullyCoveredByWishFile() throws Exception {
        final byte[] sql = Files.readAllBytes(Path.of("src/files/TimetableExportScriptFinal.sql"));
        final WishFile wishFile = new ObjectMapper()
                .readValue(new File(TimetableExportImporter.WISHES_PATH), WishFile.class);

        final MappedExport mapped = TimetableExportImporter.map(
                TimetableExportImporter.parse(TimetableExportImporter.decode(sql)), wishFile.wishes());

        assertEquals(181, mapped.teachers().size());
        assertEquals(List.of(), mapped.unmappedWishes());
        assertEquals(List.of(), mapped.warnings());
    }
}
