package at.htlleonding.admin;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import java.util.Map;

import org.junit.jupiter.api.Test;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;

// Simulates the production defaults (both admin actions switched off)
@QuarkusTest
@TestProfile(AdminDisabledTest.DisabledProfile.class)
public class AdminDisabledTest {
    public static class DisabledProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "leoplaner.reset-enabled", "false",
                    "leoplaner.demo-data-enabled", "false");
        }
    }

    @Test
    public void featuresAreDisabled() {
        given().when().get("/api/admin/features")
                .then().statusCode(200)
                .body("resetEnabled", equalTo(false))
                .body("demoDataEnabled", equalTo(false));
    }

    @Test
    public void resetIsForbidden() {
        given().when().delete("/api/admin/data").then().statusCode(403);
    }

    @Test
    public void demoDataIsForbidden() {
        given().when().post("/api/admin/demo-data").then().statusCode(403);
    }
}
