package at.htlleonding.leoplaner.dto;

public record ClassSubjectDTO(int weeklyHours, boolean requiresDoublePeriod, boolean isBetterDoublePeriod,
    String className, TeacherDTO teacher, SubjectDTO subject) {
}
