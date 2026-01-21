package at.htlleonding.leoplaner.boundary;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.List;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.RoomTypes;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonPreferredHours;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.dto.ClassSubjectDTO;
import at.htlleonding.leoplaner.dto.ClassSubjectInstanceDTO;
import at.htlleonding.leoplaner.dto.PeriodDTO;
import at.htlleonding.leoplaner.dto.RoomDTO;
import at.htlleonding.leoplaner.dto.SubjectClassLinkDTO;
import at.htlleonding.leoplaner.dto.TeacherDTO;
import at.htlleonding.leoplaner.dto.TeacherNoSubjectDTO;
import at.htlleonding.leoplaner.dto.TeacherNonPreferredHourDTO;
import at.htlleonding.leoplaner.dto.TeacherNonWorkingHourDTO;
import at.htlleonding.leoplaner.dto.TeacherSubjectLinkDTO;
import at.htlleonding.leoplaner.dto.TeacherTimetableDTO;
import at.htlleonding.leoplaner.dto.TimetableDTO;
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
    public TimetableDTO getCurrentTimeTable() {
        Timetable timetable = this.dataRepository.getCurrentSortedBySchoolhourTimetable();
        List<ClassSubjectInstanceDTO> classSubjectInstanceDTOs = new ArrayList<>();

        for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            if (csi.getPeriod().isLunchBreak()) {
                classSubjectInstanceDTOs.add(new ClassSubjectInstanceDTO(1, null, 
                    new PeriodDTO(csi.getPeriod().getSchoolDays(), csi.getPeriod().getSchoolHour(), csi.getPeriod().isLunchBreak()), 
                    null));
                continue;
            }

            if (csi.getRoom() == null || csi.getClassSubject() == null || csi.getPeriod() == null) continue;

            classSubjectInstanceDTOs.add(
                                      new ClassSubjectInstanceDTO(csi.getDuration(),
                                      new RoomDTO(csi.getRoom().getRoomNumber(), csi.getRoom().getRoomName(), csi.getRoom().getRoomPrefix(), csi.getRoom().getRoomSuffix(), csi.getRoom().getRoomTypes()),
                                      new PeriodDTO(csi.getPeriod().getSchoolDays(), csi.getPeriod().getSchoolHour(), csi.getPeriod().isLunchBreak()),
                                      new ClassSubjectDTO(csi.getClassSubject().getWeeklyHours(), csi.getClassSubject().isRequiresDoublePeriod(), csi.getClassSubject().isBetterDoublePeriod(), csi.getClassSubject().getClassName(), 
                                                  new TeacherSubjectLinkDTO(csi.getClassSubject().getTeacher().getTeacherName(), csi.getClassSubject().getTeacher().getNameSymbol()),
                                                  new SubjectClassLinkDTO(csi.getClassSubject().getSubject().getSubjectName(), csi.getClassSubject().getSubject().getSubjectColor()))));
        }

        return new TimetableDTO(timetable.getTotalWeeklyHours(), classSubjectInstanceDTOs);
        //return Response.status(Response.Status.OK).entity(this.dataRepository.getCurrentSortedBySchoolhourTimetable()).build();
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
    

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Path("/getByTeacher/{id}")
    public TeacherTimetableDTO getTeacherTimetable(@PathParam("id") Long id) {
        final Timetable timetableTeacher = this.dataRepository.getCurrentTeacherTimetable(id);
        final Teacher teacher = this.dataRepository.getTeacherByID(id);
        return new TeacherTimetableDTO(
              new TeacherNoSubjectDTO(teacher.getTeacherName(), teacher.getNameSymbol(), teacher.getTeacher_non_working_hours().stream().map(e -> new TeacherNonWorkingHourDTO(e.getDay(), e.getSchoolHour())).toList(),
              teacher.getTeacher_non_preferred_hours().stream().map(e -> new TeacherNonPreferredHourDTO(e.getDay(), e.getSchoolHour())).toList()), 
              new TimetableDTO(timetableTeacher.getTotalWeeklyHours(), 
                              timetableTeacher.getClassSubjectInstances().stream().map(
                                      csi -> new ClassSubjectInstanceDTO(csi.getDuration(),
                                      new RoomDTO(csi.getRoom().getRoomNumber(), csi.getRoom().getRoomName(), csi.getRoom().getRoomPrefix(), csi.getRoom().getRoomSuffix(), csi.getRoom().getRoomTypes()),
                                      new PeriodDTO(csi.getPeriod().getSchoolDays(), csi.getPeriod().getSchoolHour(), csi.getPeriod().isLunchBreak()),
                                      new ClassSubjectDTO(csi.getClassSubject().getWeeklyHours(), csi.getClassSubject().isRequiresDoublePeriod(), csi.getClassSubject().isBetterDoublePeriod(), csi.getClassSubject().getClassName(), 
                                                  new TeacherSubjectLinkDTO(csi.getClassSubject().getTeacher().getTeacherName(), csi.getClassSubject().getTeacher().getNameSymbol()),
                                                  new SubjectClassLinkDTO(csi.getClassSubject().getSubject().getSubjectName(), csi.getClassSubject().getSubject().getSubjectColor())))
                              ).toList()));
    }
}
