package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.dto.ClassSubjectDTO;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriBuilder;
import jakarta.ws.rs.core.UriInfo;

@Path("api/classSubjects")
public class ClassSubjectResource {
    @Context
    UriInfo uriInfo;
    @Inject
    DataRepository dataRepository;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<ClassSubjectDTO> getAllClassSubjects() {
        return dataRepository.getAllClassSubjects().stream().map(e -> UtilBuildFunctions.createClassSubjectDTO(e))
                .toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addClassSubject(ClassSubject classSubject) {
        ClassSubject createdClassSubject = this.dataRepository.addClassSubject(classSubject); // TODO add Error handling

        UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
        uriBuilder.path(Long.toString(createdClassSubject.getId()));

        return Response.created(uriBuilder.build()).build();
    }

    @Path("/getByClass/{className}")
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<ClassSubjectDTO> getAllClassSubjects(@PathParam("className") String className) {
        return dataRepository.getAllClassSubjectsWithClass(className).stream()
                .map(e -> UtilBuildFunctions.createClassSubjectDTO(e))
                .toList();
    }
}
