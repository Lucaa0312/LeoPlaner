package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;

import at.htlleonding.leoplaner.data.RgbColor;
import at.htlleonding.leoplaner.data.RoomTypes;

public record SubjectDTO(String subjectName, RgbColor subjectColor, ArrayList<RoomTypes> requiredRoomTypes) {
}
