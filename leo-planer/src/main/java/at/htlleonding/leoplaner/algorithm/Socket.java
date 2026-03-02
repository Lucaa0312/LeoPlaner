package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.dto.AlgorithmProgressDTO;
import java.util.HashSet;
import java.util.Set;
import org.hibernate.Session;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.websocket.server.ServerEndpoint;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnOpen;


@ServerEndpoint("/api/algorithm/progress")
@ApplicationScoped
public class Socket {
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
    String json = "{...}"; 
    // Now you just loop the set
    sessions.forEach(s -> s.getAsyncRemote().sendText(json));
}
}
