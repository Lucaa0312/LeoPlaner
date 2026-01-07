package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Timetable;
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
import jakarta.ws.rs.core.UriInfo;

@Path("api/timetable")
public class TimeTableResource {
    @Context
    UriInfo uriInfo;
    @Inject
    DataRepository dataRepository;


    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response getCurrentTimeTable() {
        return Response.status(Response.Status.OK).entity(this.dataRepository.getCurrentSortedBySchoolhourTimetable()).build();
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/randomize")
    public Response randomizeTimeTable() {
        Room room = this.dataRepository.getRoomByNumber(24);
        this.dataRepository.createTimetable("4chitm", room);
        return Response.status(Response.Status.OK)
                .entity(this.dataRepository.getCurrentTimetable())
                .build();
    }
    
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/getByDay/{day}")
    public Response getClassSubjectInstancesByDay(@PathParam("day") String day) {
      List<ClassSubjectInstance> timetableByDay = this.dataRepository.getCurrentTimetable().getClassSubjectInstances().stream()
                .filter(e -> e.getPeriod().getSchoolDays() == SchoolDays.valueOf(day.toUpperCase())).sorted((e1, e2) -> e1.getPeriod().getSchoolHour() - e2.getPeriod().getSchoolHour()).toList();

      return Response.status(Response.Status.OK).entity(timetableByDay).build();
    }
}
