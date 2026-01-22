package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.dto.*;

public class UtilBuildFunctions {

  public static ClassSubjectInstanceDTO createClassSubjectInstanceDTO(ClassSubjectInstance csi) {
    return new ClassSubjectInstanceDTO(csi.getDuration(),
        new RoomDTO(csi.getRoom().getRoomNumber(), csi.getRoom().getRoomName(), csi.getRoom().getRoomPrefix(),
            csi.getRoom().getRoomSuffix(), csi.getRoom().getRoomTypes()),
        new PeriodDTO(csi.getPeriod().getSchoolDays(), csi.getPeriod().getSchoolHour(), csi.getPeriod().isLunchBreak()),
        new ClassSubjectDTO(csi.getClassSubject().getWeeklyHours(), csi.getClassSubject().isRequiresDoublePeriod(),
            csi.getClassSubject().isBetterDoublePeriod(), csi.getClassSubject().getClassName(),
            new TeacherSubjectLinkDTO(csi.getClassSubject().getTeacher().getId(),
                csi.getClassSubject().getTeacher().getTeacherName(),
                csi.getClassSubject().getTeacher().getNameSymbol()),
            new SubjectClassLinkDTO(csi.getClassSubject().getSubject().getId(),
                csi.getClassSubject().getSubject().getSubjectName(),
                csi.getClassSubject().getSubject().getSubjectColor())));
  }

  public static TeacherDTO createTeacherDTO(Teacher teacher) {
    return new TeacherDTO(teacher.getId(), teacher.getTeacherName(), teacher.getNameSymbol(),
        teacher.getTeachingSubject().stream()
            .map(ts -> new SubjectDTO(ts.getId(), ts.getSubjectName(), ts.getSubjectColor(), ts.getRequiredRoomTypes()))
            .toList());
  }
}
