package at.htlleonding.leoplaner.boundary;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.jboss.resteasy.plugins.providers.multipart.InputPart;
import org.jboss.resteasy.plugins.providers.multipart.MultipartFormDataInput;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.ExcelManager;
import at.htlleonding.leoplaner.data.ImportFileType;
import at.htlleonding.leoplaner.data.ImportSelection;
import at.htlleonding.leoplaner.data.ImportSelection.NamedFile;
import at.htlleonding.leoplaner.data.SchoolDataImport;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.data.TimetableExportImporter.Wish;
import at.htlleonding.leoplaner.dto.ImportFileDTO;
import at.htlleonding.leoplaner.dto.ImportResultDTO;
import at.htlleonding.leoplaner.dto.SchoolDataImportResultDTO;
import at.htlleonding.leoplaner.dto.TimetableExportImportResultDTO;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

// The one import of the dashboard: an Excel export, or the real school data (see ImportSelection).
// The files are recognized by their content and checked as a whole before anything is written.
@Path("api/import")
public class ImportResource {
    private static final Pattern FILE_NAME = Pattern.compile("filename=\"([^\"]*)\"");

    @Inject
    DataRepository dataRepository;

    @Inject
    ExcelManager excelManager;

    @Inject
    SchoolDataImport schoolDataImport;

    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    public Response importFiles(final MultipartFormDataInput input) {
        final List<NamedFile> uploaded = new ArrayList<>();
        try {
            for (final List<InputPart> parts : input.getFormDataMap().values()) {
                for (final InputPart part : parts) {
                    try (InputStream in = part.getBody(InputStream.class, null)) {
                        uploaded.add(new NamedFile(fileName(part), in.readAllBytes()));
                    }
                }
            }
        } catch (final IOException e) {
            return answer(Response.Status.BAD_REQUEST, "Die Dateien konnten nicht gelesen werden.", List.of());
        }

        final ImportSelection selection = ImportSelection.check(uploaded);
        final List<ImportFileDTO> files = selection.getFiles().stream()
                .map(f -> new ImportFileDTO(f.name(), f.type().getLabel()))
                .toList();

        if (!selection.isValid()) {
            return answer(Response.Status.BAD_REQUEST, selection.getError(), files);
        }
        if (dataRepository.getAlgorithmRunning()) {
            return answer(Response.Status.CONFLICT,
                    "Der Algorithmus läuft gerade. Bitte warten, bis er fertig ist, und dann importieren.", files);
        }

        return switch (selection.getKind()) {
            case EXCEL -> importExcel(selection, files);
            case SCHOOL_DATA -> importSchoolData(selection, files);
        };
    }

    private Response importExcel(final ImportSelection selection, final List<ImportFileDTO> files) {
        try {
            excelManager.importFile(new ByteArrayInputStream(selection.content(ImportFileType.EXCEL)));
            dataRepository.randomizeSchoolSchedule();
        } catch (final Exception e) {
            return answer(Response.Status.INTERNAL_SERVER_ERROR,
                    "Die Excel-Datei wurde erkannt, der Import ist aber fehlgeschlagen.", files);
        }
        return Response.ok(new ImportResultDTO("Excel-Datei importiert.", files, List.of(), null)).build();
    }

    private Response importSchoolData(final ImportSelection selection, final List<ImportFileDTO> files) {
        final byte[] wishFile = selection.content(ImportFileType.TEACHER_WISHES);
        final SchoolDataImportResultDTO result;
        try {
            final List<Wish> wishes = wishFile == null ? List.of() : TimetableExportImporter.readWishes(wishFile);
            result = schoolDataImport.importSchoolData(
                    selection.content(ImportFileType.TIMETABLE_EXPORT),
                    selection.content(ImportFileType.GPU_SUBJECTS),
                    selection.content(ImportFileType.GPU_LESSONS),
                    wishes,
                    null);
        } catch (IOException | IllegalArgumentException | IndexOutOfBoundsException | DateTimeParseException e) {
            return answer(Response.Status.BAD_REQUEST,
                    "Die Dateien wurden erkannt, ihr Inhalt konnte aber nicht gelesen werden: " + e.getMessage(),
                    files);
        } catch (final Exception e) {
            return answer(Response.Status.INTERNAL_SERVER_ERROR,
                    "Der Import der Schuldaten ist fehlgeschlagen: " + e.getMessage(), files);
        }

        final TimetableExportImportResultDTO teachers = result.teachers();
        final String message = "Schuldaten importiert: "
                + (teachers.createdTeachers() + teachers.updatedTeachers()) + " Lehrer, "
                + (result.gpu().createdSubjects() + result.gpu().updatedSubjects()) + " Fächer, "
                + (result.gpu().createdClasses() + result.gpu().updatedClasses()) + " Klassen, "
                + result.gpu().lessons() + " Unterrichtseinheiten.";

        final List<String> warnings = new ArrayList<>();
        final int unmapped = teachers.unmappedWishes().size();
        if (unmapped > 0 && wishFile == null) {
            warnings.add("Keine Lehrerwünsche-Datei ausgewählt: " + unmapped
                    + " Wünsche wurden nicht übernommen, die gesperrten Stunden schon.");
        } else if (unmapped > 0) {
            warnings.add(unmapped + " Wünsche nicht übernommen, weil sich ihr Text geändert hat: "
                    + String.join(", ", teachers.unmappedWishes()));
        }

        return Response.ok(new ImportResultDTO(message, files, warnings, result)).build();
    }

    private static Response answer(final Response.Status status, final String message,
            final List<ImportFileDTO> files) {
        return Response.status(status).entity(new ImportResultDTO(message, files, List.of(), null)).build();
    }

    // Content-Disposition: form-data; name="files"; filename="GPU006.TXT"
    private static String fileName(final InputPart part) {
        final String disposition = part.getHeaders().getFirst("Content-Disposition");
        if (disposition == null) {
            return "";
        }
        final Matcher matcher = FILE_NAME.matcher(disposition);
        return matcher.find() ? matcher.group(1) : "";
    }
}
