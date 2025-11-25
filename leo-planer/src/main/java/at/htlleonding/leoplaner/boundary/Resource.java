package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.UriInfo;
import org.jboss.logging.Logger;

@Path("api")
public class Resource {
    private static final Logger LOG = Logger.getLogger(Resource.class);

    @Context
    UriInfo uriInfo;
    @Inject
    DataRepository dataRepository;

    @Path("run/testCsv")
    @GET
    public void injectTestCsvData() {
        String endpoint = "GET /api/run/testCsv";
        String requestUri = uriInfo.getRequestUri().toString();
        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Starting CSV data injection process", endpoint, requestUri);
        
        final String teacherCSVPath = "src/resources/csvFiles/test1/testTeacher.csv";
        final String subjectCSVPath = "src/resources/csvFiles/test1/testSubject.csv";
        final String classSubjectCSVPath = "src/resources/csvFiles/test1/testClassSubject.csv";
        final String roomCSVPath = "src/resources/csvFiles/test1/testRoom.csv";

        try {
            LOG.infof("[ENDPOINT: %s] Processing subject CSV file: %s", endpoint, subjectCSVPath);
            boolean subjectSuccess = CSVManager.processCSV(subjectCSVPath, dataRepository);
            if (!subjectSuccess) {
                LOG.warnf("[ENDPOINT: %s] Failed to process subject CSV file: %s", endpoint, subjectCSVPath);
            } else {
                LOG.infof("[ENDPOINT: %s] Successfully processed subject CSV file: %s", endpoint, subjectCSVPath);
            }

            LOG.infof("[ENDPOINT: %s] Processing teacher CSV file: %s", endpoint, teacherCSVPath);
            boolean teacherSuccess = CSVManager.processCSV(teacherCSVPath, dataRepository);
            if (!teacherSuccess) {
                LOG.warnf("[ENDPOINT: %s] Failed to process teacher CSV file: %s", endpoint, teacherCSVPath);
            } else {
                LOG.infof("[ENDPOINT: %s] Successfully processed teacher CSV file: %s", endpoint, teacherCSVPath);
            }

            LOG.infof("[ENDPOINT: %s] Processing class subject CSV file: %s", endpoint, classSubjectCSVPath);
            boolean classSubjectSuccess = CSVManager.processCSV(classSubjectCSVPath, dataRepository);
            if (!classSubjectSuccess) {
                LOG.warnf("[ENDPOINT: %s] Failed to process class subject CSV file: %s", endpoint, classSubjectCSVPath);
            } else {
                LOG.infof("[ENDPOINT: %s] Successfully processed class subject CSV file: %s", endpoint, classSubjectCSVPath);
            }

            LOG.infof("[ENDPOINT: %s] Processing room CSV file: %s", endpoint, roomCSVPath);
            boolean roomSuccess = CSVManager.processCSV(roomCSVPath, dataRepository);
            if (!roomSuccess) {
                LOG.warnf("[ENDPOINT: %s] Failed to process room CSV file: %s", endpoint, roomCSVPath);
            } else {
                LOG.infof("[ENDPOINT: %s] Successfully processed room CSV file: %s", endpoint, roomCSVPath);
            }

            LOG.infof("[ENDPOINT: %s] Retrieving room by number: 24", endpoint);
            Room room = this.dataRepository.getRoomByNumber(24);
            if (room == null) {
                LOG.warnf("[ENDPOINT: %s] Room with number 24 not found in database", endpoint);
            } else {
                LOG.infof("[ENDPOINT: %s] Successfully retrieved room - Number: %d, ID: %d", endpoint, room.getRoomNumber(), room.getId());
            }

            LOG.infof("[ENDPOINT: %s] Creating timetable for class: '4chitm'", endpoint);
            this.dataRepository.createTimetable("4chitm", room);
            LOG.infof("[ENDPOINT: %s] [STATUS: SUCCESS] Successfully completed CSV data injection and timetable creation for class '4chitm'", endpoint);
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: ERROR] Error occurred during CSV data injection - Exception: %s", endpoint, e.getMessage());
            throw e;
        }
    }
}
