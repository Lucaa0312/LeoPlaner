package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.algorithm.CoolingMode;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.ExcelManager;
import at.htlleonding.leoplaner.data.GpuImporter;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.dto.GpuImportResultDTO;
import at.htlleonding.leoplaner.dto.SchoolDataImportResultDTO;
import at.htlleonding.leoplaner.dto.TimetableExportImportResultDTO;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.List;

@Path("api")
public class Resource {

    @Context
    UriInfo uriInfo;

    @Inject
    DataRepository dataRepository;

    @Inject
    SimulatedAnnealingAlgorithm simulatedAnnealingAlgorithm;

    @Inject
    ExcelManager excelManager;

    @Inject
    TimetableExportImporter timetableExportImporter;

    @Inject
    GpuImporter gpuImporter;

    @Path("run/testCsvOriginal")
    @GET
    public void injectTestCsvData() {
        final String teacherCSVPath =
            "src/files/csvFiles/test1/testTeacher.csv";
        final String subjectCSVPath =
            "src/files/csvFiles/test1/testSubject.csv";
        final String classSubjectCSVPath =
            "src/files/csvFiles/test1/testClassSubject.csv";
        final String roomCSVPath = "src/files/csvFiles/test1/testRoom.csv";

        CSVManager.processCSV(subjectCSVPath, dataRepository);
        CSVManager.processCSV(teacherCSVPath, dataRepository);
        CSVManager.processCSV(classSubjectCSVPath, dataRepository);
        CSVManager.processCSV(roomCSVPath, dataRepository);
        Room room = this.dataRepository.getRoomByNumber(24);

        this.dataRepository.generateTimetableForClass("4chitm", room);
    }

    @Path("run/testCsvNew")
    @GET
    public void injectTestCsvDataNew() {
        this.dataRepository.loadDemoData();
    }

    @Path("run/generateRandomSchedule")
    @GET
    public void generateSchoolSchedule() {
        this.dataRepository.randomizeSchoolSchedule();
    }

    @Path("run/algorithmAllClasses")
    @GET
    public void runAlgorithm() {
        simulatedAnnealingAlgorithm.algorithmLoop();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("randomize")
    public void randomizeTimeTable() {
        this.dataRepository.clearHistory();
        this.dataRepository.randomizeSchoolSchedule();
    }

    @Path("get/algorithmHistory")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<History> getHistoryList() {
        return this.dataRepository.getHistory();
    }

    @Path("isAlgorithmRunning")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public boolean isAlgorithmRunning() {
        return this.dataRepository.getAlgorithmRunning();
    }

    @Path("isAlgorithmRunningAtLeastOnce")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public boolean isAlgorithmRunningAtLeastOnce() {
        return this.dataRepository.isAlgorithmRunningAtLeastOnce();
    }

    @Path("stopAlgorithmAllClasses")
    @GET
    public void stopAlgorithmAllClasses() {
        this.simulatedAnnealingAlgorithm.setIsRunning(false);
    }

    @Path("toggleAutomaticMode")
    @GET
    public void toggleAutomaticMode() {
        this.simulatedAnnealingAlgorithm.toggleAutomaticMode();
    }

    @Path("isAutomaticMode")
    @GET
    public void getAutomaticMode() {
        this.dataRepository.isAutomaticMode();
    }

    @Path("loadBestSchedule")
    @GET
    public void loadBestSchedule() {
        this.dataRepository.loadBestSchedule();
    }

    @GET
    @Path("/test-export")
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response triggerExport() throws Exception {
        try {
            final byte[] workbook = excelManager.createBaseDataWorkbook();

            return Response.ok(workbook)
                .header(
                    "Content-Disposition",
                    "attachment; filename=\"export.xlsx\""
                )
                .build();
        } catch (Exception e) {
            throw new Exception(e);
        }
    }

    @POST
    @Path("/test-import")
    @Consumes(MediaType.TEXT_PLAIN)
    public void triggerImport() throws Exception {
        try {
            excelManager.importAll();
        } catch (Exception e) {
            throw new Exception(e);
        }
    }

    private static final String TIMETABLE_EXPORT_PATH =
        "src/files/TimetableExportScriptFinal.sql";

    @POST
    @Path("/uploadExcel")
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    @Produces(MediaType.TEXT_PLAIN)
    public Response upload(InputStream is) {
        try {
            excelManager.importFile(is);
            this.dataRepository.randomizeSchoolSchedule();
        } catch (Exception e) {
            return Response.status(500)
                .entity("Excel processing failed")
                .build();
        }

        return Response.ok("Import successful").build();
    }

    /**
     * Imports teachers, their blocked hours and their mapped wishes from the
     * SQL Server script export (TimetableExportScriptFinal.sql).
     */
    @POST
    @Path("/uploadTimetableExport")
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    @Produces(MediaType.APPLICATION_JSON)
    public Response uploadTimetableExport(InputStream is) {
        byte[] sqlBytes;
        try {
            sqlBytes = is.readAllBytes();
        } catch (IOException e) {
            return Response.status(500)
                .entity("Failed to read the uploaded file")
                .build();
        }

        try {
            TimetableExportImportResultDTO result =
                timetableExportImporter.importExport(sqlBytes);
            return Response.ok(result).build();
        } catch (IllegalArgumentException | StringIndexOutOfBoundsException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity("Timetable export could not be parsed: " + e.getMessage())
                .build();
        } catch (Exception e) {
            return Response.status(500)
                .entity("Timetable export import failed: " + e.getMessage())
                .build();
        }
    }

    /**
     * Imports the whole school from src/files: teachers and their wishes from
     * the SQL Server export first, then subjects, rooms, classes and lessons
     * from the Untis GPU files, and builds a fresh starting schedule.
     * date (yyyy-MM-dd) picks which lessons are active, by default the start
     * of the school year.
     */
    @Path("run/importSchoolData")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response importSchoolData(@QueryParam("date") String date) {
        try {
            LocalDate referenceDate = date == null || date.isBlank()
                ? null
                : LocalDate.parse(date);

            // the placed lessons point at the ClassSubjects the import replaces
            this.dataRepository.clearTimetableData();
            this.dataRepository.clearHistory();

            TimetableExportImportResultDTO teachers =
                timetableExportImporter.importExport(
                    Files.readAllBytes(Paths.get(TIMETABLE_EXPORT_PATH))
                );
            GpuImportResultDTO gpu = gpuImporter.importGpu(
                Files.readAllBytes(Paths.get(GpuImporter.SUBJECTS_PATH)),
                Files.readAllBytes(Paths.get(GpuImporter.LESSONS_PATH)),
                referenceDate
            );

            this.dataRepository.randomizeSchoolSchedule();
            return Response.ok(
                new SchoolDataImportResultDTO(teachers, gpu)
            ).build();
        } catch (
            DateTimeParseException
            | IllegalArgumentException
            | StringIndexOutOfBoundsException e
        ) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity("School data could not be parsed: " + e.getMessage())
                .build();
        } catch (Exception e) {
            return Response.status(500)
                .entity("School data import failed: " + e.getMessage())
                .build();
        }
    }

    @Path("setLogCooling")
    @GET
    public void setLogCooling() {
        this.dataRepository.setCoolingMode(CoolingMode.LOGARITHMIC);
    }

    @Path("setGeoCooling")
    @GET
    public void setGeoCooling() {
        this.dataRepository.setCoolingMode(CoolingMode.GEOMETRIC);
    }

    @POST
    @Path("importExcel/{fileName}")
    @Consumes(MediaType.TEXT_PLAIN)
    public void importFile(@PathParam("fileName") String fileName)
        throws Exception {
        try (InputStream in = new FileInputStream(fileName)) {
            excelManager.importFile(in);
        } catch (Exception e) {
            throw new Exception(e);
        }
    }
}
