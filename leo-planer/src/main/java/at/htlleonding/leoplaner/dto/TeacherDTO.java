package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;

public record TeacherDTO(String teacherName, String nameSymbol, ArrayList<SubjectDTO> teachingSubject) {
}
