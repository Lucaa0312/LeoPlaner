package at.htlleonding.leoplaner.wishes;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Talks to anything that speaks the OpenAI chat completions API - Mistral,
 * Ollama, vLLM - so the model can be swapped by configuration alone.
 *
 * json_schema makes the server itself enforce the answer's shape; servers
 * that do not know it get json_object, and the extractor still checks.
 */
public class OpenAiCompatibleWishClient implements WishExtractionClient {

    private static final Duration TIMEOUT = Duration.ofMinutes(3);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    private final String baseUrl;
    private final String model;
    private final String apiKey;
    private final JsonNode schema;
    private final boolean structuredOutput;

    public OpenAiCompatibleWishClient(final String baseUrl, final String model, final String apiKey,
            final JsonNode schema, final boolean structuredOutput) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.model = model;
        this.apiKey = apiKey;
        this.schema = schema;
        this.structuredOutput = structuredOutput;
    }

    @Override
    public String extract(final String systemPrompt, final String wishText)
            throws IOException, InterruptedException {
        final Map<String, Object> responseFormat = structuredOutput
                ? Map.of("type", "json_schema",
                        "json_schema", Map.of("name", "teacher_wishes", "strict", true, "schema", schema))
                : Map.of("type", "json_object");

        final Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0,
                "response_format", responseFormat,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", wishText)));

        final HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        if (apiKey != null && !apiKey.isBlank()) {
            request.header("Authorization", "Bearer " + apiKey);
        }

        final HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() / 100 != 2) {
            throw new IOException("HTTP " + response.statusCode() + ": " + response.body());
        }

        final JsonNode content = mapper.readTree(response.body())
                .path("choices").path(0).path("message").path("content");
        if (!content.isTextual()) {
            throw new IOException("no message content in response");
        }
        return content.asText();
    }

    @Override
    public String modelId() {
        return baseUrl + "#" + model;
    }
}
