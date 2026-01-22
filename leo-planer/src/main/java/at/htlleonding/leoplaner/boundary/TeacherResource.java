package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.dto.SubjectDTO;
import at.htlleonding.leoplaner.dto.TeacherDTO;
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

@Path("api/teachers")
public class TeacherResource {
    @Inject
    DataRepository dataRepository;
    @Context
    UriInfo uriInfo;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public List<TeacherDTO> getAllTeachers() {
        return dataRepository.getAllTeachers().stream().map(e ->
                UtilBuildFunctions.createTeacherDTO(e)
        ).toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.MEDIA_TYPE_WILDCARD)
    public Response addTeacher(Teacher teacher) {
        Teacher teacherCreated = this.dataRepository.addTeacher(teacher); // TODO add Error handling

        UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
        uriBuilder.path(Long.toString(teacherCreated.getId()));

        return Response.created(uriBuilder.build()).build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/getTeacherCount")
    public Response getTeacherCount() {
        Long teacherCount = this.dataRepository.getTeacherCount();
        return Response.status(Response.Status.OK).entity(teacherCount).build();
    }
}


