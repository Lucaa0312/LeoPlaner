package at.htlleonding.leoplaner.boundary;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Date;
import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.ExcelManager;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Timetable;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

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

    @Path("run/testCsvOriginal")
    @GET
    public void injectTestCsvData() {
        final String teacherCSVPath = "src/files/csvFiles/test1/testTeacher.csv";
        final String subjectCSVPath = "src/files/csvFiles/test1/testSubject.csv";
        final String classSubjectCSVPath = "src/files/csvFiles/test1/testClassSubject.csv";
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
        final String baseDir = "../script/fakerGeneration/csvOutput/";

        final String teacherCSVPath = baseDir + "teachers.csv";
        final String classSubjectCSVPath = baseDir + "classSubjects.csv";
        final String roomCSVPath = baseDir + "rooms.csv";

        final String subjectCSVPath = "src/files/csvFiles/test1/testSubject.csv";

        CSVManager.processCSV(subjectCSVPath, dataRepository);
        CSVManager.processCSV(teacherCSVPath, dataRepository);
        CSVManager.processCSV(roomCSVPath, dataRepository);
        CSVManager.processCSV(classSubjectCSVPath, dataRepository);

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
        this.dataRepository.setAllTimetables(deepCopy(this.dataRepository.getBestSchoolSchedule()));
    }

    private Map<String, Timetable> deepCopy(Map<String, Timetable> original) {
        Map<String, Timetable> copy = new HashMap<>();
        for (Map.Entry<String, Timetable> entry : original.entrySet()) {
            copy.put(entry.getKey(), new Timetable(entry.getValue()));
        }
        return copy;
    }

    @GET
    @Path("/test-export")
    public void triggerExport() throws Exception {
        try {
            excelManager.createBaseDataWorkbook();
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

    private static final String archivePath = "src/files/excelFiles/export/";

    @POST
    @Path("/uploadExcel")
    @Consumes(MediaType.APPLICATION_OCTET_STREAM)
    @Produces(MediaType.TEXT_PLAIN)
    public Response upload(InputStream is) {
        String outFileName = archivePath + "upload_" + System.currentTimeMillis() + ".xlsx";
        try (OutputStream os = new FileOutputStream(outFileName)) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
                os.write(buffer, 0, len);
            }
        } catch (IOException e) {
            return Response.status(500)
                    .entity("Failed to save file: " + outFileName)
                    .build();
        }

        try {
            excelManager.importFile(outFileName);
        } catch (Exception e) {
            return Response.status(500)
                    .entity("Excel processing failed")
                    .build();
        }

        return Response.ok(outFileName).build();
    }

    @POST
    @Path("importExcel/{fileName}")
    @Consumes(MediaType.TEXT_PLAIN)
    public void importFile(@PathParam("fileName") String fileName) throws Exception {
        try {
            excelManager.importFile(fileName);
        } catch (Exception e) {
            throw new Exception(e);
        }
    }
}
