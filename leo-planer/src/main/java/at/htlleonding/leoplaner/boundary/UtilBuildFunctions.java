package at.htlleonding.leoplaner.boundary;

import java.util.List;

import at.htlleonding.leoplaner.data.*;
import at.htlleonding.leoplaner.dto.*;

public class UtilBuildFunctions {

    public static List<ClassSubjectInstanceDTO> createListOfClassSubjectInstancesDTO(
            List<ClassSubjectInstance> classSubjectInstances) {
        return classSubjectInstances.stream().map(e -> createClassSubjectInstanceDTO(e)).toList();
    }

    public static ClassSubjectInstanceDTO createClassSubjectInstanceDTO(ClassSubjectInstance csi) {
        final ClassSubject classSubject = csi.getClassSubject();
        final Period period = csi.getPeriod();
        final Room room = csi.getRoom();

        return new ClassSubjectInstanceDTO(csi.getDuration(),
                UtilBuildFunctions.createRoomDTO(room),
                UtilBuildFunctions.createPeriodDTO(period),
                UtilBuildFunctions.createClassSubjectDTO(classSubject));
    }

    public static TeacherDTO createTeacherDTO(Teacher teacher) {
        return new TeacherDTO(teacher.getId(), teacher.getTeacherName(), teacher.getNameSymbol(),
                teacher.getTeachingSubject().stream()
                        .map(ts -> new SubjectDTO(ts.getId(), ts.getSubjectName(), ts.getSubjectColor(),
                                ts.getRequiredRoomTypes()))
                        .toList());
    }

    public static SubjectDTO createSubjectDTO(Subject subject) {
        return new SubjectDTO(subject.getId(), subject.getSubjectName(), subject.getSubjectColor(),
                subject.getRequiredRoomTypes());
    }

    public static SubjectClassLinkDTO createSubjectClassLinkDTO(Subject subject) {
        return new SubjectClassLinkDTO(subject.getId(), subject.getSubjectName(), subject.getSubjectColor());
    }

    public static TeacherSubjectLinkDTO createTeacherSubjectLinkDTO(Teacher teacher) {
        return new TeacherSubjectLinkDTO(teacher.getId(), teacher.getTeacherName(), teacher.getNameSymbol());
    }

    public static RoomDTO createRoomDTO(Room room) {
        if (room == null) {
            return null;
        }
        return new RoomDTO(room.getId(), room.getRoomNumber(), room.getRoomName(), room.getNameShort(),
                room.getRoomTypes());
    }

    public static PeriodDTO createPeriodDTO(Period period) {
        if (period == null) {
            return null;
        }
        return new PeriodDTO(period.getSchoolDays(), period.getSchoolHour(), period.isLunchBreak());
    }

    public static ClassSubjectDTO createClassSubjectDTO(ClassSubject classSubject) {
        if (classSubject == null) {
            return null;
        }

        return new ClassSubjectDTO(classSubject.getWeeklyHours(), classSubject.isRequiresDoublePeriod(),
                classSubject.isBetterDoublePeriod(), classSubject.getSchoolClass().getClassName(),
                UtilBuildFunctions.createTeacherSubjectLinkDTO(classSubject.getTeacher()),
                UtilBuildFunctions.createSubjectClassLinkDTO(classSubject.getSubject()));
    }

    public static TimetableDTO createTimetableDTO(Timetable timetable) {
        return new TimetableDTO(timetable.getTotalWeeklyHours(),
                createListOfClassSubjectInstancesDTO(timetable.getClassSubjectInstances()),
                timetable.getCostOfTimetable(), timetable.getTempAtTimetable());
    }

}
