package at.htlleonding.leoplaner.dto;

import java.util.List;

public record TimetableDTO(int weeklyHours, List<ClassSubjectInstanceDTO> classSubjectInstances) {

    public TimetableDTO {
        classSubjectInstances = List.copyOf(classSubjectInstances);
    }
}
