package at.htlleonding.constraintsLogic;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.GpuImporter;
import at.htlleonding.leoplaner.data.GpuImporter.GpuClass;
import at.htlleonding.leoplaner.data.GpuImporter.GpuClassSubject;
import at.htlleonding.leoplaner.data.GpuImporter.GpuSubject;
import at.htlleonding.leoplaner.data.GpuImporter.MappedGpu;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.Subject;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TimetableExportImporter;
import at.htlleonding.leoplaner.data.TimetableExportImporter.ImportedTeacher;
import at.htlleonding.leoplaner.data.TimetableExportImporter.WishFile;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The real school - GPU lessons plus the teachers' blocked hours and wishes
 * from the timetable export - built in memory the way the importers would
 * store it, without a database.
 */
final class RealSchool {

    final MappedGpu mapped;
    final Map<String, Teacher> teachers = new HashMap<>();
    final Map<String, SchoolClass> classes = new HashMap<>();
    final List<ClassSubject> classSubjects = new ArrayList<>();

    private RealSchool(final MappedGpu mapped) {
        this.mapped = mapped;
    }

    static RealSchool load() throws Exception {
        final MappedGpu mapped = GpuImporter.map(
                GpuImporter.parse(Files.readAllBytes(Path.of(GpuImporter.SUBJECTS_PATH))),
                GpuImporter.parse(Files.readAllBytes(Path.of(GpuImporter.LESSONS_PATH))),
                null);
        final RealSchool school = new RealSchool(mapped);
        long id = 1;

        final WishFile wishes = new ObjectMapper().readValue(new File(TimetableExportImporter.WISHES_PATH),
                WishFile.class);
        final byte[] sql = Files.readAllBytes(Path.of("src/files/TimetableExportScriptFinal.sql"));
        for (final ImportedTeacher imported : TimetableExportImporter
                .map(TimetableExportImporter.parse(TimetableExportImporter.decode(sql)), wishes.wishes())
                .teachers()) {
            final Teacher teacher = new Teacher();
            teacher.setId(id++);
            teacher.setNameSymbol(imported.nameSymbol());
            teacher.setTeacherName(imported.teacherName());
            teacher.getTeacher_non_working_hours().addAll(imported.nonWorking());
            teacher.getTeacher_non_preferred_hours().addAll(imported.nonPreferred());
            school.teachers.put(imported.nameSymbol(), teacher);
        }

        final Map<String, Room> rooms = new HashMap<>();
        for (final String code : mapped.rooms()) {
            final Room room = new Room();
            room.setId(id++);
            room.setNameShort(code);
            room.setRoomName(code);
            rooms.put(code, room);
        }

        for (final GpuClass imported : mapped.classes()) {
            final SchoolClass schoolClass = new SchoolClass();
            schoolClass.setId(id++);
            schoolClass.setClassName(imported.name());
            schoolClass.setClassRoom(imported.homeRoom() == null ? null : rooms.get(imported.homeRoom()));
            schoolClass.setFirstHour(imported.firstHour());
            schoolClass.setLastHour(imported.lastHour());
            school.classes.put(imported.name(), schoolClass);
        }

        final Map<String, Subject> subjects = new HashMap<>();
        for (final GpuSubject imported : mapped.subjects()) {
            final Subject subject = new Subject();
            subject.setId(id++);
            subject.setSubjectSymbol(imported.symbol());
            subject.setSubjectName(imported.name());
            subjects.put(imported.symbol(), subject);
        }

        for (final GpuClassSubject imported : mapped.classSubjects()) {
            final List<Teacher> lessonTeachers = new ArrayList<>();
            for (final String symbol : imported.teacherSymbols()) {
                Teacher teacher = school.teachers.get(symbol);
                if (teacher == null) {
                    teacher = new Teacher();
                    teacher.setId(id++);
                    teacher.setNameSymbol(symbol);
                    teacher.setTeacherName(symbol);
                    school.teachers.put(symbol, teacher);
                }
                lessonTeachers.add(teacher);
            }
            final ClassSubject cs = new ClassSubject();
            cs.setId(id++);
            cs.setSchoolClass(school.classes.get(imported.className()));
            cs.setSubject(subjects.get(imported.subjectSymbol()));
            cs.setTeachers(lessonTeachers);
            cs.setWeeklyHours(imported.weeklyHours());
            cs.setCouplingKey(imported.couplingKey());
            cs.setParallelGroup(imported.parallelGroup());
            cs.setBlockSizes(imported.blockSizes());
            imported.fixedRooms().forEach(code -> cs.getFixedRooms().add(rooms.get(code)));
            school.classSubjects.add(cs);
        }
        return school;
    }
}
