package at.htlleonding.excel;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.SchoolClass;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

// Export -> reset -> import has to restore the relations, even though every row gets a new id.
@QuarkusTest
public class ExcelRoundTripTest {
    @Inject
    DataRepository dataRepository;

    @BeforeEach
    @AfterEach
    public void emptyDatabase() {
        dataRepository.deleteAllData();
    }

    @Test
    public void exportResetImportKeepsRelations() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);

        final List<String> classNamesBefore = dataRepository.getAllSchoolClasses().stream()
                .map(SchoolClass::getClassName).sorted().toList();
        final long classSubjectsBefore = dataRepository.getAllClassSubjects().size();
        assertFalse(classNamesBefore.isEmpty());

        final byte[] workbook = given().when().get("/api/test-export")
                .then().statusCode(200).extract().asByteArray();

        given().when().delete("/api/admin/data").then().statusCode(204);
        assertEquals(0, dataRepository.getAllSchoolClasses().size());

        given().contentType("application/octet-stream").body(workbook)
                .when().post("/api/uploadExcel")
                .then().statusCode(200);

        assertEquals(classNamesBefore, dataRepository.getAllSchoolClasses().stream()
                .map(SchoolClass::getClassName).sorted().toList());
        assertEquals(classSubjectsBefore, dataRepository.getAllClassSubjects().size());

        for (final SchoolClass schoolClass : dataRepository.getAllSchoolClasses()) {
            assertNotNull(schoolClass.getClassRoom(), "class " + schoolClass.getClassName() + " lost its room");
        }

        for (final ClassSubject classSubject : dataRepository.getAllClassSubjects()) {
            assertNotNull(classSubject.getSchoolClass(), "class subject lost its school class");
            assertNotNull(classSubject.getSubject(), "class subject lost its subject");
            assertFalse(classSubject.getTeachers().isEmpty(), "class subject lost its teachers");
        }

        assertTrue(dataRepository.getAllTeachers().stream()
                .anyMatch(teacher -> !teacher.getTeachingSubject().isEmpty()),
                "no teacher kept its subjects");
    }
}
