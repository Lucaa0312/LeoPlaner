package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Teacher;
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

@Path("api/teachers")
public class TeacherResource {
    private static final Logger LOG = Logger.getLogger(TeacherResource.class);

    @Inject
    DataRepository dataRepository;
    @Context
    UriInfo uriInfo;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllTeachers() {
        String endpoint = "GET /api/teachers";
        String requestUri = uriInfo.getRequestUri().toString();
        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Fetching all teachers", endpoint, requestUri);
        
        try {
            List<Teacher> teachers = dataRepository.getAllTeachers();
            LOG.infof("[ENDPOINT: %s] [STATUS: 200 OK] Successfully retrieved %d teachers", endpoint, teachers.size());
            return Response.status(Response.Status.OK).entity(teachers).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while fetching all teachers - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addTeacher(Teacher teacher) {
        String endpoint = "POST /api/teachers";
        String requestUri = uriInfo.getRequestUri().toString();
        
        if (teacher == null) {
            LOG.warnf("[ENDPOINT: %s] [URI: %s] [STATUS: 400 BAD_REQUEST] Request received with null teacher payload", endpoint, requestUri);
            return Response.status(Response.Status.BAD_REQUEST).build();
        }

        LOG.infof("[ENDPOINT: %s] [URI: %s] Request received - Adding new teacher", endpoint, requestUri);
        
        try {
            Teacher teacherCreated = this.dataRepository.addTeacher(teacher);

            if (teacherCreated == null) {
                LOG.warnf("[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Failed to create teacher - repository returned null", endpoint);
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
            }

            UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
            uriBuilder.path(Long.toString(teacherCreated.getId()));
            String createdUri = uriBuilder.build().toString();

            LOG.infof("[ENDPOINT: %s] [STATUS: 201 CREATED] Successfully created teacher - ID: %d, Location: %s", endpoint, teacherCreated.getId(), createdUri);
            return Response.created(uriBuilder.build()).build();
        } catch (Exception e) {
            LOG.errorf(e, "[ENDPOINT: %s] [STATUS: 500 INTERNAL_SERVER_ERROR] Error occurred while adding teacher - Exception: %s", endpoint, e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).build();
        }


    }
}


