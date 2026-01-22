package at.htlleonding.leoplaner.boundary;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Subject;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.dto.*;

public class UtilBuildFunctions {

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
            .map(ts -> new SubjectDTO(ts.getId(), ts.getSubjectName(), ts.getSubjectColor(), ts.getRequiredRoomTypes()))
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
    return new RoomDTO(room.getId(), room.getRoomNumber(), room.getRoomName(), room.getRoomPrefix(),
        room.getRoomSuffix(), room.getRoomTypes());
  }

  public static PeriodDTO createPeriodDTO(Period period) {
    return new PeriodDTO(period.getSchoolDays(), period.getSchoolHour(), period.isLunchBreak());
  }

  public static ClassSubjectDTO createClassSubjectDTO(ClassSubject classSubject) {
    return new ClassSubjectDTO(classSubject.getWeeklyHours(), classSubject.isRequiresDoublePeriod(),
        classSubject.isBetterDoublePeriod(), classSubject.getClassName(),
        UtilBuildFunctions.createTeacherSubjectLinkDTO(classSubject.getTeacher()),
        UtilBuildFunctions.createSubjectClassLinkDTO(classSubject.getSubject()));
  }

}
