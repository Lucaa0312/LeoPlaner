package at.htlleonding.leoplaner.data;

import java.time.LocalDate;
import java.util.List;

import at.htlleonding.leoplaner.data.TimetableExportImporter.Wish;
import at.htlleonding.leoplaner.dto.GpuImportResultDTO;
import at.htlleonding.leoplaner.dto.SchoolDataImportResultDTO;
import at.htlleonding.leoplaner.dto.TimetableExportImportResultDTO;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Imports the whole school in the only order that works: teachers and their
 * wishes from the SQL export first, then subjects, rooms, classes and lessons
 * from the Untis GPU files (the lessons point at those teachers), and builds a
 * fresh starting schedule. Used by the upload and by the dev shortcut.
 */
@ApplicationScoped
public class SchoolDataImport {

    @Inject
    DataRepository dataRepository;

    @Inject
    TimetableExportImporter timetableExportImporter;

    @Inject
    GpuImporter gpuImporter;

    /** wishes may be empty; referenceDate null means the start of the school year. */
    public SchoolDataImportResultDTO importSchoolData(final byte[] timetableExport, final byte[] gpuSubjects,
            final byte[] gpuLessons, final List<Wish> wishes, final LocalDate referenceDate) {
        // the placed lessons point at the ClassSubjects the import replaces
        dataRepository.clearTimetableData();
        dataRepository.clearHistory();

        final TimetableExportImportResultDTO teachers = timetableExportImporter.importExport(timetableExport, wishes);
        final GpuImportResultDTO gpu = gpuImporter.importGpu(gpuSubjects, gpuLessons, referenceDate);

        dataRepository.randomizeSchoolSchedule();
        return new SchoolDataImportResultDTO(teachers, gpu);
    }
}
