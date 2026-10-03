package at.htlleonding.leoplaner.dto;

import java.util.List;

/**
 * The answer of /api/import, for success and for errors: message says what
 * happened (German), files lists every upload with its recognized type,
 * warnings are things the user should know about a successful import, and
 * schoolData holds the full counts of a school data import (null otherwise).
 */
public record ImportResultDTO(String message, List<ImportFileDTO> files, List<String> warnings,
        SchoolDataImportResultDTO schoolData) {
}
