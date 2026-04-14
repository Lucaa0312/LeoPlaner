package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import java.util.HashSet;
import java.util.Set;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import java.util.Locale;

@ServerEndpoint("/api/algorithm/progress")
@ApplicationScoped
public class Socket {
    @Inject
    SimulatedAnnealingAlgorithm simulatedAnnealingAlgorithm;

    private final Set<Session> sessions = new HashSet<Session>();

    @OnOpen
    public void onOpen(Session session) {
        sessions.add(session);
    }

    @OnClose
    public void onClose(Session session) {
        sessions.remove(session);
    }

    public void onProgressUpdate(@Observes AlgorithmProgressDTO progress) {
        String json = String.format(Locale.US, "{\"iteration\": %d,"
                + "\"temperature\": %f,"
                + "\"currentCost\": %d,"
                + "\"finished\": %s}",
                progress.iteration(),
                progress.temperature(),
                progress.currentCost(),
                progress.finished());

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
            } else if (update.startsWith("resume")) {
                simulatedAnnealingAlgorithm.resumeAlgorithm();
            } else {
                System.out.println("Unknown message: " + update);
            }
        } catch (NumberFormatException e) {
            System.out.println("Encountered error: " + e.getMessage());
        }
    }
}
