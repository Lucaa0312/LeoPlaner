package at.htlleonding.leoplaner.dto;

import java.util.List;

public record TeacherDTOwithWishes(Long id, String teacherName, String nameSymbol, List<SubjectDTO> teachingSubject,
        List<TeacherNonWorkingHourDTO> teacherNonWorkingHours,
        List<TeacherNonPreferredHourDTO> teacherNonPreferredHours) {
}
