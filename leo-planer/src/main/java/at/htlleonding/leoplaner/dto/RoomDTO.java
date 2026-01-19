package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;

import at.htlleonding.leoplaner.data.RoomTypes;

public record RoomDTO(short roomNumber, String roomName, String roomPrefix, String roomSuffix,
    ArrayList<RoomTypes> roomTypes) {
}
