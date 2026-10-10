package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;

@ServerEndpoint("/api/algorithm/progress")
@ApplicationScoped
public class Socket {
    @Inject
    SimulatedAnnealingAlgorithm simulatedAnnealingAlgorithm;

    @Inject
    ObjectMapper objectMapper;

    // opened and closed on websocket threads while the algorithm thread
    // iterates it for every progress event
    private final Set<Session> sessions = ConcurrentHashMap.newKeySet();

    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
    }

    public void onProgressUpdate(@Observes AlgorithmProgressDTO progress) {
        final String json;
        try {
            json = objectMapper.writeValueAsString(progress);
        } catch (JsonProcessingException e) {
            System.out.println("Could not write progress: " + e.getMessage());
            return;
        }

        sessions.forEach(s -> s.getAsyncRemote().sendText(json));
    }

    @OnMessage
    public void OnMessageHandler(String update) {
        try {
            if (update.startsWith("temperature:")) {
                double newTemperature = Double.parseDouble(update.substring("temperature:".length()));
                SimulatedAnnealingAlgorithm.setTemperature(newTemperature);
            } else if (update.startsWith("pause")) {
                simulatedAnnealingAlgorithm.pauseAlgorithm();
            } else if (update.startsWith("resume:")) {
                simulatedAnnealingAlgorithm.resumeAlgorithm(RunState.parseMode(update.substring("resume:".length())));
            } else if (update.startsWith("resume")) {
                simulatedAnnealingAlgorithm.resumeAlgorithm();
            } else if (update.startsWith("mode:")) {
                simulatedAnnealingAlgorithm.applyMode(RunState.parseMode(update.substring("mode:".length())));
            } else if (update.startsWith("toggleAutoMode")) {
                simulatedAnnealingAlgorithm.toggleAutomaticMode();
            } else {
                System.out.println("Unknown message: " + update);
            }
        } catch (NumberFormatException e) {
            System.out.println("Encountered error: " + e.getMessage());
        }
    }
}
