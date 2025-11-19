package at.htlleonding.leoplaner.data;

import org.hibernate.annotations.NamedQuery;
import org.hibernate.annotations.NamedQueries;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

// TODO add NamedQueries
@Entity
@NamedQueries({
  @NamedQuery(name = Room.QUERY_FIND_ALL, query = "select r from room r")
})
public class Room {
  @Id
  @GeneratedValue
  private long id;
    private short roomNumber;
    private String roomName;
    private String roomPrefix;
    private String roomSuffix;
    private RoomTypes[] roomTypes; // TODO foreing key or not
  
    public static final String QUERY_FIND_ALL = "Room.findAll";


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

    public RoomTypes[] getRoomTypes() {
        return roomTypes;
    }

    public void setId(long id) {
      this.id = id;
    }

    public void setRoomNumber(short roomNumber) {
      this.roomNumber = roomNumber;
    }

    public void setRoomName(String roomName) {
      this.roomName = roomName;
    }

    public void setRoomPrefix(String roomPrefix) {
      this.roomPrefix = roomPrefix;
    }

    public void setRoomSuffix(String roomSuffix) {
      this.roomSuffix = roomSuffix;
    }

    public void setRoomTypes(RoomTypes[] roomTypes) {
      this.roomTypes = roomTypes;
    }
}
