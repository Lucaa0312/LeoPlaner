package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;
import java.util.List;

import at.htlleonding.leoplaner.data.RgbColor;
import at.htlleonding.leoplaner.data.RoomTypes;

public record SubjectDTO(String subjectName, RgbColor subjectColor, List<RoomTypes> requiredRoomTypes) {
    public SubjectDTO {
        requiredRoomTypes = List.copyOf(requiredRoomTypes);
    }
}
