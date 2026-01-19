package at.htlleonding.leoplaner.data;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jdk.jfr.Name;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import java.util.List;

// TODO add NamedQueries
@NamedQueries({
        @NamedQuery(name = Room.QUERY_FIND_ALL, query = "select r from Room r"),
        @NamedQuery(name = Room.QUERY_FIND_BY_ID, query = "select r from Room r where r.id = :filter"),
        @NamedQuery(name = Room.QUERY_FIND_BY_NUMBER, query = "select r from Room r where r.roomNumber = :filter"),
        @NamedQuery(name = Room.QUERY_GET_COUNT, query = "select count(r) from Room r")
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
    @JsonIgnore
    private List<RoomTypes> roomTypes;

    public static final String QUERY_FIND_ALL = "Room.findAll";
    public static final String QUERY_FIND_BY_ID = "Room.findByID";
    public static final String QUERY_FIND_BY_NUMBER = "Room.findByNumber";
    public static final String QUERY_GET_COUNT = "Room.getCount";


    public short getRoomNumber() {
        return roomNumber;
    }

    public String getRoomName() {
        return roomName;
    }

    public String getRoomPrefix() {
        return roomPrefix;
    }

    public Long getId() {
        return id;
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
