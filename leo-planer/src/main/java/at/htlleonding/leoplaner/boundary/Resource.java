package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.ExcelManager;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.Timetable;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.UriInfo;

@Path("api")
public class Resource {
    @Context
    UriInfo uriInfo;
    @Inject
    DataRepository dataRepository;
    @Inject
    SimulatedAnnealingAlgorithm simulatedAnnealingAlgorithm;

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
    
    @GET
    @Path("/test-export")
    public void triggerExport() throws Exception {

        Timetable table = new Timetable();
        ClassSubjectInstance classSubjectInstance = new ClassSubjectInstance();

        ClassSubject classSubject = new ClassSubject();
        Teacher teacher = new Teacher();
        teacher.setTeacherName("Adolf");

        classSubject.setTeacher(teacher);

        Period period = new Period();
        period.setSchoolHour(5);

        Room room = new Room();
        room.setNameShort("PE");

        classSubjectInstance.setClassSubject(classSubject);
        classSubjectInstance.setPeriod(period);
        classSubjectInstance.setRoom(room);
        classSubjectInstance.setDuration(10);

        table.setClassSubjectInstances(List.of(classSubjectInstance));
        table.setTotalWeeklyHours(0);

        try {
            ExcelManager.exportTimetable(table);
        } catch (Exception e) {
           throw new Exception(e);
        }
    }
}

