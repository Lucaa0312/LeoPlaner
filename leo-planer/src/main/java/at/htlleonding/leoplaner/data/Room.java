package at.htlleonding.leoplaner.data;

import jakarta.persistence.*;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import java.util.List;

@NamedQueries({
        @NamedQuery(name = Room.QUERY_FIND_ALL, query = "select r from Room r"),
        @NamedQuery(name = Room.QUERY_FIND_BY_ID, query = "select r from Room r where r.id = :filter"),
        @NamedQuery(name = Room.QUERY_GET_RANDOM, query = "select r from Room r where r.id = 1"),
        @NamedQuery(name = Room.QUERY_FIND_BY_NUMBER, query = "select r from Room r where r.roomNumber = :filter"),
        @NamedQuery(name = Room.QUERY_GET_COUNT, query = "select count(r) from Room r"),
        @NamedQuery(name = Room.QUERY_FIND_BY_NUMBERNAME, query = "select r from Room r where r.roomNumber || r.roomName = :filter"),
        @NamedQuery(name = Room.QUERY_FIND_BY_NAME, query = "select r from Room r where r.roomName = :filter")
})
@Entity
public class Room {
    @Id
    @GeneratedValue
    private Long id;
    private short roomNumber;
    private String roomName;
    private String nameShort;

    @ElementCollection(fetch = FetchType.EAGER)
    @Enumerated(EnumType.STRING)
    @CollectionTable( // create new join table
            name = "room_roomtypes", joinColumns = @JoinColumn(name = "room_id"))
    private List<RoomTypes> roomTypes;

    public static final String QUERY_FIND_ALL = "Room.findAll";
    public static final String QUERY_FIND_BY_ID = "Room.findByID";
    public static final String QUERY_FIND_BY_NUMBER = "Room.findByNumber";
    public static final String QUERY_FIND_BY_NAME = "Room.findByName";
    public static final String QUERY_FIND_BY_NUMBERNAME = "Room.findByNumberName";
    public static final String QUERY_GET_COUNT = "Room.getCount";
    public static final String QUERY_GET_RANDOM = "Room.getRandom";

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

    public void setId(Long id) {
        this.id = id;
    }

    public String getNameShort() {
        return nameShort;
    }

    public void setNameShort(String nameShort) {
        this.nameShort = nameShort;
    }

    public static String getQueryFindAll() {
        return QUERY_FIND_ALL;
    }

    public static String getQueryFindById() {
        return QUERY_FIND_BY_ID;
    }

    public static String getQueryFindByNumber() {
        return QUERY_FIND_BY_NUMBER;
    }

    public static String getQueryGetCount() {
        return QUERY_GET_COUNT;
    }

    public void setRoomTypes(final List<RoomTypes> roomTypes) {
        this.roomTypes = roomTypes;
    }
}
