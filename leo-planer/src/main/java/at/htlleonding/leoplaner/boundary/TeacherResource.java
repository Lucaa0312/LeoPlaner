package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.dto.TeacherDTO;
import at.htlleonding.leoplaner.dto.TeacherDTOwithWishes;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriBuilder;
import jakarta.ws.rs.core.UriInfo;
import java.util.List;

@Path("api/teachers")
public class TeacherResource {

    @Inject
    DataRepository dataRepository;

    @Context
    UriInfo uriInfo;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getAllTeachers() {
        try {
            List<TeacherDTO> teachers = dataRepository
                    .getAllTeachers()
                    .stream()
                    .map(UtilBuildFunctions::createTeacherDTO)
                    .toList();

            return Response.ok(teachers).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to fetch teachers")
                    .build();
        }
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response addTeacher(Teacher teacher) {
        try {
            Teacher teacherCreated = this.dataRepository.addTeacher(teacher);

            if (teacherCreated == null || teacherCreated.getId() == null) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity("Failed to create teacher")
                        .build();
            }

            UriBuilder uriBuilder = this.uriInfo.getAbsolutePathBuilder();
            uriBuilder.path(Long.toString(teacherCreated.getId()));

            return Response.created(uriBuilder.build())
                    .entity(teacherCreated)
                    .build();

        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(e.getMessage())
                    .build();
        }
    }

    @GET
    @Path("/withWishes")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getTeacherWithWishes() {
        try {
            List<TeacherDTOwithWishes> teachersWithWishes =
                    this.dataRepository.getAllTeachers()
                            .stream()
                            .map(UtilBuildFunctions::createTeacherDTOWithWishes)
                            .toList();

            return Response.ok(teachersWithWishes).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to fetch teachers with wishes")
                    .build();
        }
    }

    @GET
    @Path("/getTeacherCount")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getTeacherCount() {
        try {
            Long teacherCount = this.dataRepository.getTeacherCount();

            return Response.ok(teacherCount).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to fetch teacher count")
                    .build();
        }
    }

    // TODO maybe refactor route to just /id

    @PUT
    @Path("update/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response updateTeacher(@PathParam("id") Long id, Teacher teacher) {
        try {
            Teacher updatedTeacher = dataRepository.updateTeacher(id, teacher);

            if (updatedTeacher == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Teacher not found")
                        .build();
            }

            return Response.ok(updatedTeacher).build();

        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .entity(e.getMessage())
                    .build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to update teacher")
                    .build();
        }
    }

    @DELETE
    @Path("delete/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response deleteTeacher(@PathParam("id") Long id) {
        try {
            Teacher teacherToDelete = dataRepository.deleteTeacher(id);

            if (teacherToDelete == null) {
                return Response.status(Response.Status.NOT_FOUND)
                        .entity("Teacher not found")
                        .build();
            }

            return Response.ok(teacherToDelete).build();

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity("Failed to delete teacher")
                    .build();
        }
    }
}