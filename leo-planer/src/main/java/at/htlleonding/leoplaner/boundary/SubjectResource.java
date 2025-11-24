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

@Path("api/subjects")
public class SubjectResource {
    @Inject
    DataRepository dataRepository;
    @Context
    UriInfo uriInfo;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllSubjects() {
        List<Subject> subjects = dataRepository.getAllSubjects();
        return Response.status(Response.Status.OK).entity(subjects).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addSubject(Subject subject) {
        Subject subjectCreated = this.dataRepository.addSubject(subject); // TODO add Error handling

        UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
        uriBuilder.path(Long.toString(subjectCreated.getId()));

        return Response.created(uriBuilder.build()).build();
    }
}


