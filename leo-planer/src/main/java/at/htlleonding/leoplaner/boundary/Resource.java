package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Context;
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

        this.dataRepository.createTimetableForClass("4chitm", room);
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
        CSVManager.processCSV(classSubjectCSVPath, dataRepository);
        CSVManager.processCSV(roomCSVPath, dataRepository);

        this.dataRepository.initRandomTimetableForAllClasses();
    }

    @Path("run/algorithm")
    @GET
    public void runAlgorithm() {
        simulatedAnnealingAlgorithm.algorithmLoop();
    }
}
