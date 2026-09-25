package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import at.htlleonding.leoplaner.algorithm.Block;
import at.htlleonding.leoplaner.algorithm.CostBreakdown;
import at.htlleonding.leoplaner.algorithm.CostCategory;
import at.htlleonding.leoplaner.algorithm.Schedule;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherNonWorkingHours;
import at.htlleonding.leoplaner.data.Timetable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.Test;

public class TestSchedule {

    private long nextId = 1;

    private Room room(final String code) {
        final Room room = new Room();
        room.setId(nextId++);
        room.setNameShort(code);
        room.setRoomName(code);
        return room;
    }

    private SchoolClass schoolClass(final String name, final Room home) {
        final SchoolClass schoolClass = new SchoolClass();
        schoolClass.setId(nextId++);
        schoolClass.setClassName(name);
        schoolClass.setClassRoom(home);
        return schoolClass;
    }

    private Teacher teacher(final String symbol) {
        final Teacher teacher = new Teacher();
        teacher.setId(nextId++);
        teacher.setNameSymbol(symbol);
        teacher.setTeacherName(symbol);
        return teacher;
    }

    private ClassSubject lesson(final SchoolClass schoolClass, final int hours, final Teacher... teachers) {
        final ClassSubject cs = new ClassSubject();
        cs.setId(nextId++);
        cs.setSchoolClass(schoolClass);
        cs.setWeeklyHours(hours);
        cs.setTeachers(new ArrayList<>(List.of(teachers)));
        return cs;
    }

    private static Block blockOf(final Schedule schedule, final ClassSubject cs) {
        return schedule.getBlocks().stream().filter(b -> b.getMembers().contains(cs)).findFirst().orElseThrow();
    }

    private static void place(final Schedule schedule, final Block block, final int day, final int hour) {
        schedule.apply(new Schedule.Move(new Block[] { block }, new int[] { day }, new int[] { hour }));
        schedule.commit();
    }

    private static long cost(final Schedule schedule, final CostCategory category) {
        return schedule.breakdown().get(category);
    }

    @Test
    public void lengthsFollowBlockSizesThenTheDoubleFlags() {
        final ClassSubject sized = lesson(null, 5);
        sized.setBlockSizes("2,3");
        final ClassSubject preferredOdd = lesson(null, 5);
        preferredOdd.setBetterDoublePeriod(true);
        final ClassSubject plain = lesson(null, 3);

        assertEquals(List.of(2, 3), Block.lengths(sized));
        assertEquals(List.of(2, 2, 1), Block.lengths(preferredOdd));
        assertEquals(List.of(1, 1, 1), Block.lengths(plain));
    }

    @Test
    public void coupledLessonIsOneBlockOnTheSameHourInEveryClass() {
        final Teacher teacher = teacher("MITSEA");
        final SchoolClass a = schoolClass("1AHIF", room("101"));
        final SchoolClass b = schoolClass("1BHIF", room("102"));
        final ClassSubject inA = lesson(a, 2, teacher);
        final ClassSubject inB = lesson(b, 2, teacher);
        inA.setCouplingKey("GPU-487");
        inB.setCouplingKey("GPU-487");

        final Schedule schedule = Schedule.of(List.of(inA, inB));
        schedule.construct(new Random(1));

        assertEquals(2, schedule.getBlocks().size()); // two single hours, each shared by both classes
        final Map<String, Timetable> views = schedule.toTimetables(schedule.snapshot(), 0);
        final List<String> hoursA = lessonHours(views.get("1AHIF"));
        assertEquals(hoursA, lessonHours(views.get("1BHIF")));
        // taught once, so it never clashes with itself
        assertEquals(0, cost(schedule, CostCategory.TEACHER_CLASH));
        assertEquals(2, schedule.teacherTimetable(teacher, schedule.snapshot()).getClassSubjectInstances().size());
    }

    private static List<String> lessonHours(final Timetable timetable) {
        return timetable.getClassSubjectInstances().stream()
                .filter(csi -> !csi.getPeriod().isLunchBreak())
                .map(csi -> csi.getPeriod().getSchoolDays() + "-" + csi.getPeriod().getSchoolHour())
                .sorted()
                .toList();
    }

    @Test
    public void parallelGroupsMayShareAnHourOtherLessonsMayNot() {
        final SchoolClass a = schoolClass("3AHIF", room("132"));
        final ClassSubject catholic = lesson(a, 1, teacher("ROCKH"));
        final ClassSubject ethics = lesson(a, 1, teacher("MATZ"));
        final ClassSubject german = lesson(a, 1, teacher("ANZD"));
        catholic.setParallelGroup("REL");
        ethics.setParallelGroup("REL");

        final Schedule schedule = Schedule.of(List.of(catholic, ethics, german));
        place(schedule, blockOf(schedule, catholic), 0, 1);
        place(schedule, blockOf(schedule, ethics), 0, 1);
        place(schedule, blockOf(schedule, german), 0, 2);
        assertEquals(0, cost(schedule, CostCategory.CLASS_CLASH));

        place(schedule, blockOf(schedule, german), 0, 1);
        assertTrue(cost(schedule, CostCategory.CLASS_CLASH) > 0);
    }

    @Test
    public void eveningClassStaysInItsWindow() {
        final SchoolClass evening = schoolClass("3ABIF", room("153"));
        evening.setFirstHour(SchoolClass.EVENING_FIRST_HOUR);
        evening.setLastHour(SchoolClass.EVENING_LAST_HOUR);
        final Teacher teacher = teacher("REDER");
        final List<ClassSubject> lessons = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            lessons.add(lesson(evening, 4, teacher));
        }

        final Schedule schedule = Schedule.of(lessons);
        schedule.construct(new Random(1));
        for (final Block block : schedule.getBlocks()) {
            assertTrue(block.getHour() >= SchoolClass.EVENING_FIRST_HOUR, "hour " + block.getHour());
        }
        assertEquals(0, cost(schedule, CostCategory.OUTSIDE_WINDOW));

        place(schedule, schedule.getBlocks().getFirst(), 0, 3);
        assertTrue(cost(schedule, CostCategory.OUTSIDE_WINDOW) > 0);
    }

    @Test
    public void fixedRoomIsBookedOnlyOnce() {
        final Room workshop = room("U87");
        final ClassSubject first = lesson(schoolClass("1AHBG", room("230")), 1, teacher("DULL"));
        final ClassSubject second = lesson(schoolClass("2BHBG", room("228")), 1, teacher("KAISA"));
        first.getFixedRooms().add(workshop);
        second.getFixedRooms().add(workshop);

        final Schedule schedule = Schedule.of(List.of(first, second));
        place(schedule, blockOf(schedule, first), 1, 2);
        place(schedule, blockOf(schedule, second), 1, 2);

        assertTrue(cost(schedule, CostCategory.ROOM_CLASH) > 0);
    }

    @Test
    public void classesSharingAHomeRoomAreGivenDifferentRooms() {
        final Room shared = room("106");
        final Room other = room("146");
        final ClassSubject a = lesson(schoolClass("2BHITM", shared), 1, teacher("A"));
        final ClassSubject b = lesson(schoolClass("4BHITM", shared), 1, teacher("B"));
        final ClassSubject c = lesson(schoolClass("5CHIF", other), 1, teacher("C"));

        final Schedule schedule = Schedule.of(List.of(a, b, c));
        place(schedule, blockOf(schedule, a), 2, 3);
        place(schedule, blockOf(schedule, b), 2, 3);
        place(schedule, blockOf(schedule, c), 2, 5);
        final Map<String, Timetable> views = schedule.toTimetables(schedule.snapshot(), 0);

        final Room roomA = views.get("2BHITM").getClassSubjectInstances().getFirst().getRoom();
        final Room roomB = views.get("4BHITM").getClassSubjectInstances().getFirst().getRoom();
        assertNotNull(roomA);
        assertNotNull(roomB);
        assertNotEquals(roomA.getNameShort(), roomB.getNameShort());
        assertEquals(0, cost(schedule, CostCategory.ROOM_CAPACITY));

        // with the third class in the only other room there is nowhere left to go
        place(schedule, blockOf(schedule, c), 2, 3);
        assertTrue(cost(schedule, CostCategory.ROOM_CAPACITY) > 0);
    }

    @Test
    public void longDayTakesItsLunchBreakAsItsOneFreeHour() {
        final SchoolClass a = schoolClass("2AHIF", room("132"));
        final List<ClassSubject> lessons = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            lessons.add(lesson(a, 1, teacher("T" + i)));
        }
        final Schedule schedule = Schedule.of(lessons);
        final int[] hours = { 1, 2, 3, 4, 6, 7, 8, 9 };
        for (int i = 0; i < hours.length; i++) {
            place(schedule, schedule.getBlocks().get(i), 0, hours[i]);
        }

        assertEquals(0, cost(schedule, CostCategory.CLASS_GAP));
        assertEquals(0, cost(schedule, CostCategory.LUNCH_BREAK_MISSING));
        final List<ClassSubjectInstance> monday = schedule.toTimetables(schedule.snapshot(), 0).get("2AHIF")
                .getClassSubjectInstances();
        assertTrue(monday.stream().anyMatch(csi -> csi.getPeriod().isLunchBreak()
                && csi.getPeriod().getSchoolHour() == 5));

        // closing the hole leaves a long day without a break, and a second hole is a gap
        place(schedule, schedule.getBlocks().get(7), 0, 5);
        assertTrue(cost(schedule, CostCategory.LUNCH_BREAK_MISSING) > 0);
        place(schedule, schedule.getBlocks().get(7), 0, 10);
        place(schedule, schedule.getBlocks().get(6), 0, 5);
        assertTrue(cost(schedule, CostCategory.CLASS_GAP) > 0);
    }

    /** A small school with every kind of rule in it, including a lunch-heavy workshop. */
    private List<ClassSubject> smallSchool() {
        final Random random = new Random(3);
        final List<Teacher> teachers = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            final Teacher teacher = teacher("T" + i);
            // every teacher has a morning off
            final TeacherNonWorkingHours off = new TeacherNonWorkingHours();
            off.setDay(SchoolDays.values()[i % 5]);
            off.setSchoolHour(1 + random.nextInt(3));
            teacher.getTeacher_non_working_hours().add(off);
            teachers.add(teacher);
        }
        final Room workshop = room("U87");
        final List<SchoolClass> classes = new ArrayList<>();
        final List<ClassSubject> lessons = new ArrayList<>();
        for (int c = 0; c < 6; c++) {
            final SchoolClass schoolClass = schoolClass(c + "AHIF", room("R" + c));
            classes.add(schoolClass);
            for (int l = 0; l < 10; l++) {
                final ClassSubject cs = lesson(schoolClass, 3, teachers.get((c * 3 + l) % teachers.size()));
                if (l == 0) {
                    cs.setWeeklyHours(4);
                    cs.setBlockSizes("4");
                    cs.getFixedRooms().add(workshop);
                }
                lessons.add(cs);
            }
        }
        // one religion lesson coupling three classes
        for (int c = 0; c < 3; c++) {
            final ClassSubject religion = lesson(classes.get(c), 2, teachers.get(9));
            religion.setCouplingKey("GPU-REL");
            religion.setParallelGroup("REL");
            lessons.add(religion);
        }
        return lessons;
    }

    @Test
    public void incrementalCostEqualsTheFullRecount() {
        final Schedule schedule = Schedule.of(smallSchool());
        final Random random = new Random(5);
        schedule.construct(random);

        for (int i = 0; i < 20_000; i++) {
            final long delta = schedule.proposeAndApply(random);
            if (delta != Schedule.NO_MOVE && random.nextBoolean()) {
                schedule.commit();
            } else {
                schedule.rollback();
            }
            if (i % 1000 == 0) {
                final CostBreakdown breakdown = schedule.breakdown();
                assertEquals(breakdown.total(), schedule.getTotalCost(), "after move " + i);
            }
        }
    }

    @Test
    public void annealingEndsWithoutHardViolations() {
        final Schedule schedule = Schedule.of(smallSchool());
        schedule.construct(new Random(1));
        SimulatedAnnealingAlgorithm.anneal(schedule, 200_000, 100, Math.pow(0.001, 1.0 / 200_000), new Random(2));

        assertEquals(0, schedule.hardViolations(), schedule.describeHardViolations().toString());
    }

    @Test
    public void realSchoolCountsEachTeachersLessonsOnce() throws Exception {
        final RealSchool school = RealSchool.load();
        final Schedule schedule = Schedule.of(school.classSubjects);
        schedule.construct(new Random(1));

        assertEquals(17, hoursOf(schedule, school.teachers.get("MLIVA")));
        assertEquals(36, hoursOf(schedule, school.teachers.get("KLE")));
    }

    private static int hoursOf(final Schedule schedule, final Teacher teacher) {
        return schedule.teacherTimetable(teacher, schedule.snapshot()).getClassSubjectInstances().stream()
                .mapToInt(ClassSubjectInstance::getDuration)
                .sum();
    }

    @Test
    public void realSchoolIsSolvedWithoutHardViolations() throws Exception {
        final Schedule schedule = Schedule.of(RealSchool.load().classSubjects);
        schedule.construct(new Random(1));
        final long iterations = 1_000_000;
        SimulatedAnnealingAlgorithm.anneal(schedule, iterations, 100, Math.pow(0.001, 1.0 / iterations),
                new Random(2));

        assertEquals(0, schedule.hardViolations(), schedule.describeHardViolations().toString());
    }
}
