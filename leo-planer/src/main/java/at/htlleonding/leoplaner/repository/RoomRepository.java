package at.htlleonding.leoplaner.repository;

import java.util.List;

import at.htlleonding.leoplaner.data.Room;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class RoomRepository {

    @Inject
    EntityManager entityManager;

    public List<Room> getAll() {
        return Room.getAllRooms();
    }

    public Room getById(Long id) {
        return Room.getById(id);
    }

    public Room getRandom() {
        return Room.getRandomRoom();
    }

    public Room getByNumber(int number) {
        return Room.getByNumber(number);
    }

    public Room getByName(String name) {
        return Room.getByName(name);
    }

    public Room getByNumberAndName(String numberName) {
        return Room.getByNumberAndName(numberName);
    }

    public Long getCount() {
        return Room.getCountOfAllRooms();
    }

    @Transactional
    public Room add(Room room) {
        if (entityManager.contains(room)) {
            throw new IllegalArgumentException();
        }
        entityManager.persist(room);
        return room;
    }

    @Transactional
    public Room update(Long id, Room updated) {
        Room room = getById(id);

        room.setNameShort(updated.getNameShort());
        room.setRoomNumber(updated.getRoomNumber());
        room.setRoomName(updated.getRoomName());
        room.setRoomTypes(updated.getRoomTypes());

        return room;
    }

    @Transactional
    public Room delete(Long id) {
        Room room = getById(id);

        if (room != null) {
            entityManager.remove(room);
        }

        return room;
    }
}
