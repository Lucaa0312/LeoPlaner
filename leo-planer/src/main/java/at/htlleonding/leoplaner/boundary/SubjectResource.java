package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Subject;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriBuilder;
import jakarta.ws.rs.core.UriInfo;
import org.jboss.logging.Logger;

@Path("api/subjects")
public class SubjectResource {
    private static final Logger LOG = Logger.getLogger(SubjectResource.class);

    @Inject
    DataRepository dataRepository;
    @Context
    UriInfo uriInfo;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllSubjects() {
        String endpoint = "GET /api/subjects";
        String requestUri = uriInfo.getRequestUri().toString();
        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Fetching all subjects", endpoint, requestUri);
        
        try {
            List<Subject> subjects = dataRepository.getAllSubjects();
            LOG.infof("[ENDPOINT: %s] [STATUS: 200 OK] Successfully retrieved %d subjects", endpoint, subjects.size());
            return Response.status(Response.Status.OK).entity(subjects).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while fetching all subjects - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addSubject(Subject subject) {
        String endpoint = "POST /api/subjects";
        String requestUri = uriInfo.getRequestUri().toString();
        
        if (subject == null) {
            LOG.warnf("[ENDPOINT: %s] [URI: %s] [STATUS: 400 BAD_REQUEST] Request received with null subject payload", endpoint, requestUri);
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Adding new subject", endpoint, requestUri);
        
        try {
            Subject subjectCreated = this.dataRepository.addSubject(subject);

            if (subjectCreated == null) {
                LOG.warnf("[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Failed to create subject - repository returned null", endpoint);
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
            }

            UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
            uriBuilder.path(Long.toString(subjectCreated.getId()));
            String createdUri = uriBuilder.build().toString();

            LOG.infof("[ENDPOINT: %s] [STATUS: 201 CREATED] Successfully created subject - ID: %d, Location: %s", endpoint, subjectCreated.getId(), createdUri);
            return Response.created(uriBuilder.build()).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while adding subject - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }
}


