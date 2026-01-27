package at.htlleonding.leoplaner.dto;

import java.util.List;

public record TeacherDTO(Long id, String teacherName, String nameSymbol, List<SubjectDTO> teachingSubject) {
  public TeacherDTO {
    teachingSubject = List.copyOf(teachingSubject);
  }
}
