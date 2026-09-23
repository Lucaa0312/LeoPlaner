package at.htlleonding.leoplaner.dto;

import java.util.List;

public record TimetableExportImportResultDTO(int createdTeachers, int updatedTeachers, int nonWorkingHours,
        int nonPreferredHours, int skippedReservations, List<String> unmappedWishes, List<String> warnings) {
}
