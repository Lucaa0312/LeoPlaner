package at.htlleonding.leoplaner.dto;

import java.util.List;

public record TimetableDTO(int weeklyHours, List<ClassSubjectInstanceDTO> classSubjectInstances, int cost,
        double temperature) {

    public TimetableDTO {
        classSubjectInstances = List.copyOf(classSubjectInstances);
    }
}
