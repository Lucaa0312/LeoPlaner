package at.htlleonding.leoplaner.dto;

import java.util.List;

public record ClassSubjectDTO(int weeklyHours, boolean requiresDoublePeriod, boolean isBetterDoublePeriod,
        String className, String couplingKey, List<TeacherSubjectLinkDTO> teacher, SubjectClassLinkDTO subject) {
}
