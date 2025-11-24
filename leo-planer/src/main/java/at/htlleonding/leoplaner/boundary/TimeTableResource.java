package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.data.DataRepository;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;
import org.jboss.logging.Logger;

@Path("api/timetable")
public class TimeTableResource {
    private static final Logger LOG = Logger.getLogger(TimeTableResource.class);

    @Context
    UriInfo uriInfo;
    @Inject
    DataRepository dataRepository;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getCurrentTimeTable() {
        String endpoint = "GET /api/timetable";
        String requestUri = uriInfo.getRequestUri().toString();
        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Fetching current timetable", endpoint, requestUri);
        
        try {
            var timetable = this.dataRepository.getCurrentTimetable();
            if (timetable == null) {
                LOG.warnf("[ENDPOINT: %s] [STATUS: 404 NOT_FOUND] Current timetable is null - No timetable data available", endpoint);
                return Response.status(Response.Status.NOT_FOUND).build();
            }
            LOG.infof("[ENDPOINT: %s] [STATUS: 200 OK] Successfully retrieved current timetable", endpoint);
            return Response.status(Response.Status.OK).entity(timetable).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while fetching current timetable - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}
