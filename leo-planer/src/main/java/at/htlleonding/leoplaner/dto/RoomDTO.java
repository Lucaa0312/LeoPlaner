package at.htlleonding.leoplaner.dto;

import java.util.List;

import at.htlleonding.leoplaner.data.RoomTypes;

public record RoomDTO(short roomNumber, String roomName, String roomPrefix, String roomSuffix,
    List<RoomTypes> roomTypes) {

  public RoomDTO {
    roomTypes = List.copyOf(roomTypes);
  }
}
