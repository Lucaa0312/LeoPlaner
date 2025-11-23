package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Subject;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
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

    @Path("run/testCsv")
    @GET
    public void injectCsvData() {
        final String teacherCSVPath = "src/resources/csvFiles/test1/testTeacher.csv";
        final String subjectCSVPath = "src/resources/csvFiles/test1/testSubject.csv";
        final String classSubjectCSVPath = "src/resources/csvFiles/test1/testClassSubject.csv";

        CSVManager.processCSV(subjectCSVPath, dataRepository);
        CSVManager.processCSV(teacherCSVPath, dataRepository);
        CSVManager.processCSV(classSubjectCSVPath, dataRepository);
    }


}
