package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;

public record TimetableDTO(int weeklyHours, ArrayList<ClassSubjectInstanceDTO> ClassSubjectInstances) {
}
