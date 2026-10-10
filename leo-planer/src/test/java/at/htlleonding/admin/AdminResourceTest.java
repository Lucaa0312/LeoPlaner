package at.htlleonding.admin;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import at.htlleonding.leoplaner.data.DataRepository;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
public class AdminResourceTest {
    @Inject
    DataRepository dataRepository;

    // Every test starts and ends with an empty database, so other test classes are unaffected
    @BeforeEach
    @AfterEach
    public void emptyDatabase() {
        dataRepository.deleteAllData();
    }

    @Test
    public void featuresAreEnabledInTestProfile() {
        given().when().get("/api/admin/features")
                .then().statusCode(200)
                .body("resetEnabled", equalTo(true))
                .body("demoDataEnabled", equalTo(true));
    }

    @Test
    public void demoDataFillsEmptyDatabase() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);

        assertTrue(dataRepository.getTeacherCount() > 0);
        assertTrue(dataRepository.getRoomCount() > 0);
        assertTrue(dataRepository.getSubjectCount() > 0);
        assertTrue(dataRepository.getAllSchoolClasses().size() > 0);
    }

    @Test
    public void demoDataIsRejectedWhenDataExists() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);
        final long teachers = dataRepository.getTeacherCount();

        given().when().post("/api/admin/demo-data").then().statusCode(409);

        assertEquals(teachers, dataRepository.getTeacherCount());
    }

    @Test
    public void resetEmptiesAllData() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);

        given().when().delete("/api/admin/data").then().statusCode(204);

        assertEquals(0L, dataRepository.getTeacherCount());
        assertEquals(0L, dataRepository.getRoomCount());
        assertEquals(0L, dataRepository.getSubjectCount());
        assertEquals(0, dataRepository.getAllSchoolClasses().size());
        assertEquals(0, dataRepository.getAllClassSubjects().size());
        assertTrue(dataRepository.getAllTimetables().isEmpty());
    }

    @Test
    public void resetIsRejectedWhileAlgorithmRuns() {
        given().when().post("/api/admin/demo-data").then().statusCode(204);
        dataRepository.setAlgorithmRunning(true);
        try {
            given().when().delete("/api/admin/data").then().statusCode(409);
            assertTrue(dataRepository.getTeacherCount() > 0);
        } finally {
            dataRepository.setAlgorithmRunning(false);
        }
    }
}
