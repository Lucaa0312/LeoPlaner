package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;
import java.util.List;

public record TeacherDTO(String teacherName, String nameSymbol, List<SubjectDTO> teachingSubject) {
}
