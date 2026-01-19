package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;
import at.htlleonding.leoplaner.data.*;

public record TimetableDTO(ArrayList<ClassSubjectInstance> ClassSubjectInstances, int weeklyHours) {
}
