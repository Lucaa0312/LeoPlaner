package at.htlleonding.importing;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import at.htlleonding.leoplaner.data.DataRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
public class ImportResourceTest {
    @Inject
    DataRepository dataRepository;

    @BeforeEach
    @AfterEach
    public void emptyDatabase() {
        dataRepository.deleteAllData();
    }

    @Test
    public void missingFileIsRejectedAndNothingChanges() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);
        final long teachers = dataRepository.getTeacherCount();
        final long subjects = dataRepository.getSubjectCount();

        given()
                .multiPart("files", "export.sql", TestImportFileType.utf16WithBom(TestImportFileType.SQL_EXPORT))
                .multiPart("files", "GPU006.TXT",
                        TestImportFileType.GPU_SUBJECTS.getBytes(StandardCharsets.ISO_8859_1))
                .when().post("/api/import")
                .then().statusCode(400)
                .body("message", startsWith("Für die Schuldaten fehlt noch: Unterricht (Untis GPU002)"))
                .body("files", hasSize(2))
                .body("files[0].name", equalTo("export.sql"))
                .body("files[0].type", equalTo("Lehrer (Stundenplan-Export .sql)"))
                .body("files[1].type", equalTo("Fächer (Untis GPU006)"));

        assertEquals(teachers, dataRepository.getTeacherCount());
        assertEquals(subjects, dataRepository.getSubjectCount());
    }

    @Test
    public void excelGoesThroughTheSameImport() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);
        final long classes = dataRepository.getAllSchoolClasses().size();
        final byte[] workbook = given().when().get("/api/test-export")
                .then().statusCode(200).extract().asByteArray();
        given().when().delete("/api/admin/data").then().statusCode(204);

        given().multiPart("files", "leoplaner-export.xlsx", workbook)
                .when().post("/api/import")
                .then().statusCode(200)
                .body("message", equalTo("Excel-Datei importiert."))
                .body("files[0].type", equalTo("Excel-Datei (LeoPlaner-Export)"));

        assertEquals(classes, dataRepository.getAllSchoolClasses().size());
    }

    @Test
    public void realSchoolDataIsImported() throws Exception {
        // the real files only exist on the developers' machines, never in git
        final Path dir = Path.of("src/files");
        assumeTrue(Files.exists(dir.resolve("TimetableExportScriptFinal.sql")), "real school data not present");

        // deliberately scrambled names: only the content decides
        given()
                .multiPart("files", "a.txt", Files.readAllBytes(dir.resolve("GPU002db.TXT")))
                .multiPart("files", "b.txt", Files.readAllBytes(dir.resolve("teacherWishes.json")))
                .multiPart("files", "c.txt", Files.readAllBytes(dir.resolve("TimetableExportScriptFinal.sql")))
                .multiPart("files", "d.txt", Files.readAllBytes(dir.resolve("GPU006.TXT")))
                .when().post("/api/import")
                .then().statusCode(200)
                .body("message", startsWith("Schuldaten importiert:"))
                .body("warnings", hasSize(0))
                .body("schoolData", notNullValue());

        assertTrue(dataRepository.getTeacherCount() > 0);
        assertTrue(dataRepository.getAllSchoolClasses().size() > 0);
        assertTrue(dataRepository.getAllClassSubjects().size() > 0);
    }
}
