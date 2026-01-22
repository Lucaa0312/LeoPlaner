package at.htlleonding.leoplaner.dto;

import java.util.ArrayList;
import java.util.List;

public record TeacherDTO(String teacherName, String nameSymbol, List<SubjectDTO> teachingSubject) {
import java.util.List;

public record TeacherDTO(String teacherName, String nameSymbol, List<SubjectDTO> teachingSubject,
    List<TeacherNonWorkingHourDTO> teacherNonWorkingHours, List<TeacherNonPreferredHourDTO> teacherNonPreferredHours) {
}
