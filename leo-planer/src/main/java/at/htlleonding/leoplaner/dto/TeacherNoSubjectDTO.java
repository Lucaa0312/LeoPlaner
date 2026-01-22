package at.htlleonding.leoplaner.dto;

import java.util.List;

public record TeacherNoSubjectDTO(String teacherName, String nameSymbol,
    List<TeacherNonWorkingHourDTO> teacherNonWorkingHours, List<TeacherNonPreferredHourDTO> teacherNonPreferredHours) {

  public TeacherNoSubjectDTO {
    teacherNonWorkingHours = List.copyOf(teacherNonWorkingHours);
    teacherNonPreferredHours = List.copyOf(teacherNonPreferredHours);
  }
}
