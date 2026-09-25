package at.htlleonding.leoplaner.dto;

import java.util.List;
import java.util.Map;

/**
 * feasibility lists what no placement can fix (a teacher with more lessons
 * than available hours, an overbooked room); warnings are everything else
 * worth a look.
 */
public record GpuImportResultDTO(String referenceDate, int createdSubjects, int updatedSubjects, int createdRooms,
        int createdClasses, int updatedClasses, int createdTeachers, int classSubjects, int lessons,
        int coupledLessons, int parallelLessons, Map<String, Integer> skippedLessons, List<String> warnings,
        List<String> feasibility) {
}
