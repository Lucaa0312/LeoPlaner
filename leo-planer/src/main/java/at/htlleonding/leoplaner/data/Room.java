package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;

@Entity
public class Room extends PanacheEntity {
    private short roomNumber;
    private String roomName;
    private String nameShort;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable( // create new join table
            name = "room_roomtypes", joinColumns = @JoinColumn(name = "room_id"))
    private List<RoomTypes> roomTypes;

    public static List<Room> getAllRooms() {
        return listAll();
    }

    public static Room getById(final Long id) {
        return findById(id);
    }

    public static Room getByNumber(final int number) {
        return find("roomNumber", number).firstResult();
    }

    public static Room getByName(final String name) {
        return find("LOWER(roomName) like LOWER(?1)", "%" + name + "%").firstResult();
    }

    public static Room getByNumberAndName(final String filter) {
        return find("CONCAT(roomNumber, LOWER(roomName)) LIKE LOWER(?1)",
                "%" + filter + "%").firstResult();
    }

    public static long getCountOfAllRooms() {
        return count();
    }

    public static Room getRandomRoom() {
        return find("ORDER BY random()").firstResult();
    }

    public short getRoomNumber() {
        return roomNumber;
    }

    public String getRoomName() {
        return roomName;
    }

    public Long getId() {
        return id;
    }

    public List<RoomTypes> getRoomTypes() {
        return roomTypes;
    }

    public void setId(final long id) {
        this.id = id;
    }

    public void setRoomNumber(final short roomNumber) {
        this.roomNumber = roomNumber;
    }

    public void setRoomName(final String roomName) {
        this.roomName = roomName;
    }

    public void setId(final Long id) {
        this.id = id;
    }

    public String getNameShort() {
        return nameShort;
    }

    public void setNameShort(final String nameShort) {
        this.nameShort = nameShort;
    }

    public void setRoomTypes(final List<RoomTypes> roomTypes) {
        this.roomTypes = roomTypes;
    }
}
