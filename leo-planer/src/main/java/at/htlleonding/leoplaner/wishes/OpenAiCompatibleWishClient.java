package at.htlleonding.leoplaner.wishes;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
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
 *
 * max_tokens keeps a model that loops from running into the timeout. A
 * thinking model can spend all of it before it answers; the retry then sends
 * the configured reasoning_effort ("none" turns thinking off on Ollama).
 *
 * A hosted API on a free plan answers 429 when asked too fast. That is not a
 * failed answer: the same request is sent again after the wait the server
 * names in Retry-After, or a growing one of its own.
 */
public class OpenAiCompatibleWishClient implements WishExtractionClient {

    private static final Duration TIMEOUT = Duration.ofMinutes(3);
    private static final int RATE_LIMIT_TRIES = 5;
    private static final long FIRST_WAIT_SECONDS = 5;
    private static final long LONGEST_WAIT_SECONDS = 120;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper mapper = new ObjectMapper();

    private final String baseUrl;
    private final String model;
    private final String apiKey;
    private final JsonNode schema;
    private final boolean structuredOutput;
    private final int maxTokens;
    private final String retryReasoningEffort;

    public OpenAiCompatibleWishClient(final String baseUrl, final String model, final String apiKey,
            final JsonNode schema, final boolean structuredOutput, final int maxTokens,
            final String retryReasoningEffort) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.model = model;
        this.apiKey = apiKey;
        this.schema = schema;
        this.structuredOutput = structuredOutput;
        this.maxTokens = maxTokens;
        this.retryReasoningEffort = retryReasoningEffort;
    }

    @Override
    public String extract(final String systemPrompt, final String wishText)
            throws IOException, InterruptedException {
        return ask(systemPrompt, wishText, null);
    }

    @Override
    public String extractPlain(final String systemPrompt, final String wishText)
            throws IOException, InterruptedException {
        return ask(systemPrompt, wishText, retryReasoningEffort);
    }

    private String ask(final String systemPrompt, final String wishText, final String reasoningEffort)
            throws IOException, InterruptedException {
        final Map<String, Object> responseFormat = structuredOutput
                ? Map.of("type", "json_schema",
                        "json_schema", Map.of("name", "teacher_wishes", "strict", true, "schema", schema))
                : Map.of("type", "json_object");

        final Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("temperature", 0);
        body.put("max_tokens", maxTokens);
        body.put("response_format", responseFormat);
        body.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", wishText)));
        if (reasoningEffort != null && !reasoningEffort.isBlank()) {
            body.put("reasoning_effort", reasoningEffort);
        }

        final HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                .timeout(TIMEOUT)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
        if (apiKey != null && !apiKey.isBlank()) {
            request.header("Authorization", "Bearer " + apiKey);
        }

        HttpResponse<String> response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        long wait = FIRST_WAIT_SECONDS;
        for (int tries = 1; response.statusCode() == 429 && tries < RATE_LIMIT_TRIES; tries++) {
            final long seconds = Math.min(LONGEST_WAIT_SECONDS, response.headers().firstValue("Retry-After")
                    .filter(v -> v.matches("\\d+")).map(Long::parseLong).orElse(wait));
            System.out.println("Wish model is rate limited, waiting " + seconds + " s");
            Thread.sleep(seconds * 1000);
            wait *= 2;
            response = http.send(request.build(), HttpResponse.BodyHandlers.ofString());
        }
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
