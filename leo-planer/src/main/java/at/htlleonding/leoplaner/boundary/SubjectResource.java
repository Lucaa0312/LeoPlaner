package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Subject;
import at.htlleonding.leoplaner.dto.SubjectDTO;

import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
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
    public List<SubjectDTO> getAllSubjects() {
        return dataRepository.getAllSubjects().stream().map(e -> UtilBuildFunctions.createSubjectDTO(e)).toList();
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

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/getSubjectCount")
    public Response getSubjectCount() {
        Long subjectCount = this.dataRepository.getSubjectCount();
        return Response.status(Response.Status.OK).entity(subjectCount).build();
    }

    @PUT
    @Path("update/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response updateSubject(@PathParam("id") Long id, Subject subject) {
        Subject updatedSubject = dataRepository.updateSubject(id, subject);

        if (updatedSubject == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        return Response.ok(updatedSubject).build();

    }

    @DELETE
    @Path("delete/{id}")
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response deleteSubject(@PathParam("id") Long id) {
        Subject subjectToDelete = dataRepository.deleteSubject(id);

        if (subjectToDelete == null) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }

        return Response.ok(subjectToDelete).build();
    }
}
