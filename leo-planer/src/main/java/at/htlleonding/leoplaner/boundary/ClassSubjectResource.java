package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.DataRepository;
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

@Path("api/classSubjects")
public class ClassSubjectResource {
    private static final Logger LOG = Logger.getLogger(ClassSubjectResource.class);

    @Context
    UriInfo uriInfo;
    @Inject
    DataRepository dataRepository;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllClassSubjects() {
        String endpoint = "GET /api/classSubjects";
        String requestUri = uriInfo.getRequestUri().toString();
        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Fetching all class subjects", endpoint, requestUri);
        
        try {
            List<ClassSubject> classSubjects = dataRepository.getAllClassSubjects();
            LOG.infof("[ENDPOINT: %s] [STATUS: 200 OK] Successfully retrieved %d class subjects", endpoint, classSubjects.size());
            return Response.status(Response.Status.OK).entity(classSubjects).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while fetching all class subjects - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addClassSubject(ClassSubject classSubject) {
        String endpoint = "POST /api/classSubjects";
        String requestUri = uriInfo.getRequestUri().toString();
        
        if (classSubject == null) {
            LOG.warnf("[ENDPOINT: %s] [URI: %s] [STATUS: 400 BAD_REQUEST] Request received with null class subject payload", endpoint, requestUri);
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Adding new class subject", endpoint, requestUri);
        
        try {
            ClassSubject createdClassSubject = this.dataRepository.addClassSubject(classSubject);

            if (createdClassSubject == null) {
                LOG.warnf("[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Failed to create class subject - repository returned null", endpoint);
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
            }

            UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
            uriBuilder.path(Long.toString(createdClassSubject.getId()));
            String createdUri = uriBuilder.build().toString();

            LOG.infof("[ENDPOINT: %s] [STATUS: 201 CREATED] Successfully created class subject - ID: %d, Location: %s", endpoint, createdClassSubject.getId(), createdUri);
            return Response.created(uriBuilder.build()).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while adding class subject - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }


}
