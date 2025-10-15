package main.java.at.htlleonding.leoplaner.data;

public class Room {
    private short roomNumber;
    private String roomName;
    private String roomPrefix;
    private String roomSuffix;
    private RoomTypes[] roomTypes;

    public Room(short roomNumber, String roomName, String roomPrefix, String roomSuffix, RoomTypes[] roomTypes) {
        this.roomNumber = roomNumber;
        this.roomName = roomName;
        this.roomPrefix = roomPrefix;
        this.roomSuffix = roomSuffix;
        this.roomTypes = roomTypes;
    }

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
}
