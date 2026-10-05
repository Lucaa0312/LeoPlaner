package at.htlleonding.algorithm;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Duration;
import java.util.Map;
import java.util.TreeSet;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;

@QuarkusTest
public class AlgorithmStatusTest {
    @Inject
    DataRepository dataRepository;

    @Inject
    ObjectMapper objectMapper;

    @BeforeEach
    @AfterEach
    public void emptyDatabase() {
        dataRepository.getRunState().setTimeLimit(Duration.ofMinutes(15));
        dataRepository.deleteAllData();
    }

    @Test
    public void idleBeforeTheFirstRun() {
        given().when().get("/api/algorithm/status")
                .then().statusCode(200)
                .body("status", equalTo("idle"))
                .body("progress", equalTo(0.0f));
    }

    @Test
    public void einfachRunFinishesOnTheServer() throws Exception {
        given().when().post("/api/admin/demo-data").then().statusCode(204);
        // the first round's end is already past the limit: the run finishes after one round
        dataRepository.getRunState().setTimeLimit(Duration.ZERO);

        // answers when the run has ended
        given().when().get("/api/run/algorithmAllClasses?mode=einfach").then().statusCode(204);

        given().when().get("/api/algorithm/status")
                .then().statusCode(200)
                .body("status", equalTo("finished"))
                .body("mode", equalTo("einfach"))
                .body("finishReason", equalTo("time_limit"))
                .body("progress", equalTo(1.0f))
                .body("bestCost", notNullValue());

        // the WebSocket message carries the same run fields as the REST status
        final Map<?, ?> rest = given().when().get("/api/algorithm/status").as(Map.class);
        final Map<?, ?> message = objectMapper.readValue(objectMapper.writeValueAsString(
                new AlgorithmProgressDTO(1, 1, 1, true, dataRepository.getRunState().snapshot())), Map.class);
        assertEquals(new TreeSet<>(rest.keySet()), new TreeSet<>(((Map<?, ?>) message.get("run")).keySet()));
    }
}
