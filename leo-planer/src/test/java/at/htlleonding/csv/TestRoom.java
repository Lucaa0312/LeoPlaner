package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@Transactional
public class TestRoom {
    @Inject
    EntityManager entityManager;

    @Inject
    DataRepository dataRepository;

    @Test
    public void findAll() {
        Room room = new Room();
        Room room2 = new Room();

        entityManager.persist(room);
        entityManager.persist(room2);

        List<Room> rooms = dataRepository.getAllRooms();

        assertEquals(2, rooms.size());
    }

    @Test
    public void findById() {
        Room room = new Room();
        room.setRoomName("CHEM");

        entityManager.persist(room);

        Long id = room.getId();
        Room roomFound = dataRepository.getRoomById(id);
        Room roomNotExist = dataRepository.getRoomByNumber(999);
        assertEquals("CHEM", roomFound.getRoomName());
        assertEquals(null, roomNotExist);
    }

    @Test
    public void findByNumber() {
        Room room = new Room();
        room.setRoomName("CHEM");
        room.setRoomNumber((short) 101);

        entityManager.persist(room);

        Room roomFound = dataRepository.getRoomByNumber(101);
        Room roomNotExist = dataRepository.getRoomByNumber(999);
        assertEquals("CHEM", roomFound.getRoomName());
        assertEquals(null, roomNotExist);
    }
}
