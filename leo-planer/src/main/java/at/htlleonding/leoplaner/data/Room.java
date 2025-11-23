package at.htlleonding.leoplaner.data;

import jakarta.persistence.*;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import java.util.List;

// TODO add NamedQueries
@NamedQueries({
        @NamedQuery(name = Room.QUERY_FIND_ALL, query = "select r from Room r"),
        @NamedQuery(name = Room.QUERY_FIND_BY_ID, query = "select r from Room r where r.id = :filter"),
        @NamedQuery(name = Room.QUERY_FIND_BY_ID, query = "select r from Room r where r.roomNumber = :filter")
})
@Entity
public class Room {
    @Id
    @GeneratedValue
    private Long id;
    private short roomNumber;
    private String roomName;
    private String roomPrefix;
    private String roomSuffix;
    @ElementCollection(targetClass = RoomTypes.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable( //create new join table
            name = "room_roomtypes",
            joinColumns = @JoinColumn(name = "room_id")
    )
    @Column(name = "room_type")
    private List<RoomTypes> roomTypes;

    public static final String QUERY_FIND_ALL = "Room.findAll";
    public static final String QUERY_FIND_BY_ID = "Room.findByID";
    public static final String QUERY_FIND_BY_NUMBER = "Room.findByNumber";


    public short getRoomNumber() {
        return roomNumber;
    }

    public String getRoomName() {
        return roomName;
    }

    public String getRoomPrefix() {
        return roomPrefix;
    }

    public String getRoomSuffix() {
        return roomSuffix;
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

    public void setRoomPrefix(final String roomPrefix) {
        this.roomPrefix = roomPrefix;
    }

    public void setRoomSuffix(final String roomSuffix) {
        this.roomSuffix = roomSuffix;
    }

    public void setRoomTypes(final List<RoomTypes> roomTypes) {
        this.roomTypes = roomTypes;
    }
}
