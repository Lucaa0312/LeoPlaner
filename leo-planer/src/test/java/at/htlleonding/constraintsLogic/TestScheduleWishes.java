package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import at.htlleonding.leoplaner.algorithm.Block;
import at.htlleonding.leoplaner.algorithm.CostBreakdown;
import at.htlleonding.leoplaner.algorithm.CostCategory;
import at.htlleonding.leoplaner.algorithm.CostModel;
import at.htlleonding.leoplaner.algorithm.Schedule;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.algorithm.TeacherWishes.WishState;
import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.DoublePeriodMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.LinkMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishDegree;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/** Teacher wishes priced incrementally by the Schedule. */
public class TestScheduleWishes {

    private long nextId = 1;
    private final List<Teacher> teachers = new ArrayList<>();

    private Room room(final String code) {
        final Room room = new Room();
        room.setId(nextId++);
        room.setNameShort(code);
        room.setRoomName(code);
        return room;
    }

    private Teacher teacher(final String symbol) {
        final Teacher teacher = new Teacher();
        teacher.setId(nextId++);
        teacher.setNameSymbol(symbol);
        teacher.setTeacherName(symbol);
        teachers.add(teacher);
        return teacher;
    }

    private SchoolClass schoolClass(final String name, final Room home) {
        final SchoolClass schoolClass = new SchoolClass();
        schoolClass.setId(nextId++);
        schoolClass.setClassName(name);
        schoolClass.setClassRoom(home);
        return schoolClass;
    }

    private ClassSubject lesson(final SchoolClass schoolClass, final int hours, final Teacher teacher) {
        final ClassSubject cs = new ClassSubject();
        cs.setId(nextId++);
        cs.setSchoolClass(schoolClass);
        cs.setWeeklyHours(hours);
        cs.setTeachers(new ArrayList<>(List.of(teacher)));
        return cs;
    }

    private static TeacherWish wish(final WishType type, final WishDegree degree, final Integer count,
            final Integer hour, final SchoolDays day, final List<SchoolDays> candidates, final String other,
            final LinkMode linkMode, final String className, final DoublePeriodMode doubleMode, final Long roomId) {
        return new TeacherWish(type, degree, count, hour, day, candidates, other, null, linkMode, className,
                doubleMode, null, roomId, null);
    }

    private static TeacherWishProfile profile(final String symbol, final TeacherWish... wishes) {
        return new TeacherWishProfile("TR_" + symbol, null, List.of(wishes), List.of());
    }

    private List<ClassSubject> school() {
        for (int i = 0; i < 10; i++) {
            teacher("T" + i);
        }
        final List<ClassSubject> lessons = new ArrayList<>();
        for (int c = 0; c < 6; c++) {
            final SchoolClass schoolClass = schoolClass(c + "AHIF", room("R" + c));
            for (int l = 0; l < 10; l++) {
                final ClassSubject cs = lesson(schoolClass, 3, teachers.get((c * 3 + l) % teachers.size()));
                cs.setBetterDoublePeriod(l % 2 == 0);
                lessons.add(cs);
            }
        }
        return lessons;
    }

    /** Every kind of wish the Schedule prices, two links included. */
    private static List<TeacherWishProfile> everyWish() {
        return List.of(
                profile("T0", wish(WishType.FREE_DAY, WishDegree.SEVERE, null, null, null,
                        List.of(SchoolDays.FRIDAY, SchoolDays.MONDAY), null, null, null, null, null)),
                profile("T1", wish(WishType.FREE_AFTERNOON, WishDegree.HIGH, null, 5, null, null, null, null, null,
                        null, null)),
                profile("T2",
                        wish(WishType.LATEST_END, WishDegree.MID, null, 4, null, null, null, null, null, null, null),
                        wish(WishType.DOUBLE_PERIOD, WishDegree.LOW, null, null, null, null, null, null, "0AHIF",
                                DoublePeriodMode.AVOID, null)),
                profile("T3", wish(WishType.EARLIEST_START, WishDegree.MID, null, 2, SchoolDays.TUESDAY, null, null,
                        null, null, null, null)),
                profile("T4",
                        wish(WishType.MAX_CONSECUTIVE, WishDegree.MID, 2, null, null, null, null, null, null, null,
                                null),
                        wish(WishType.MAX_HOURS_PER_DAY, WishDegree.MID, 4, null, null, null, null, null, null, null,
                                null),
                        wish(WishType.NO_GAPS, WishDegree.LOW, null, null, null, null, null, null, null, null, null),
                        wish(WishType.FEW_DAYS, WishDegree.HIGH, null, null, null, null, null, null, null, null,
                                null)),
                profile("T5", wish(WishType.LINKED_TEACHER, WishDegree.HIGH, null, null, null, null, "TR_T6",
                        LinkMode.SAME_DAYS, null, null, null)),
                profile("T7", wish(WishType.LINKED_TEACHER, WishDegree.MID, null, null, SchoolDays.MONDAY, null,
                        "TR_T8", LinkMode.OPPOSITE_DAYS, null, null, null)));
    }

    @Test
    public void incrementalCostWithWishesEqualsTheFullRecount() {
        final Schedule schedule = Schedule.of(school());
        final List<String> rejected = new ArrayList<>();
        final WishState state = SimulatedAnnealingAlgorithm.wishStateOf(everyWish(), rejected);
        assertTrue(rejected.isEmpty(), rejected.toString());
        assertTrue(schedule.setWishes(state).isEmpty());

        final Random random = new Random(5);
        schedule.construct(random);
        boolean wishesPriced = false;
        for (int i = 0; i < 20_000; i++) {
            final long delta = schedule.proposeAndApply(random);
            if (delta != Schedule.NO_MOVE && random.nextBoolean()) {
                schedule.commit();
            } else {
                schedule.rollback();
            }
            if (i % 500 == 0) {
                final CostBreakdown breakdown = schedule.breakdown();
                assertEquals(breakdown.total(), schedule.getTotalCost(), "after move " + i);
                wishesPriced |= breakdown.get(CostCategory.TEACHER_WISH_LINKED) > 0
                        || breakdown.get(CostCategory.TEACHER_WISH_DAY_SHAPE) > 0;
            }
        }
        assertTrue(wishesPriced, "no wish was ever charged");
    }

    @Test
    public void removingTheWishesGivesBackTheCostWithoutThem() {
        final Schedule schedule = Schedule.of(school());
        schedule.construct(new Random(1));
        final long without = schedule.getTotalCost();

        schedule.setWishes(SimulatedAnnealingAlgorithm.wishStateOf(everyWish(), new ArrayList<>()));
        schedule.setWishes(WishState.EMPTY);

        assertEquals(without, schedule.getTotalCost());
    }

    @Test
    public void freeDayWishCostsItsUnitPlusTheHoursLeftUntilMet() {
        final Teacher wanting = teacher("FD");
        final ClassSubject cs = lesson(schoolClass("1AHIF", room("RA")), 2, wanting);
        final Schedule schedule = Schedule.of(List.of(cs));
        schedule.setWishes(SimulatedAnnealingAlgorithm.wishStateOf(
                List.of(profile("FD", wish(WishType.FREE_DAY, WishDegree.SEVERE, null, null, null,
                        List.of(SchoolDays.FRIDAY, SchoolDays.MONDAY), null, null, null, null, null))),
                new ArrayList<>()));
        final Block monday = schedule.getBlocks().get(0);
        final Block other = schedule.getBlocks().get(1);

        move(schedule, monday, 0, 1);
        move(schedule, other, 4, 1);
        // neither candidate free: the full unit, plus one hour left on the emptiest
        assertEquals(CostModel.SEVERE_COST + CostModel.LOW_COST,
                schedule.breakdown().get(CostCategory.TEACHER_WISH_FREE_DAY));

        move(schedule, other, 1, 1);
        // Friday, the first choice, is free now
        assertEquals(0, schedule.breakdown().get(CostCategory.TEACHER_WISH_FREE_DAY));
        assertEquals(schedule.breakdown().total(), schedule.getTotalCost());
    }

    private static void move(final Schedule schedule, final Block block, final int day, final int hour) {
        schedule.apply(new Schedule.Move(new Block[] { block }, new int[] { day }, new int[] { hour }));
        schedule.commit();
    }

    @Test
    public void wishToAvoidDoublesSplitsTheDoublesOfBlockSizes() {
        final ClassSubject sized = lesson(null, 7, teacher("X"));
        sized.setBlockSizes("3,2,2");
        sized.setAvoidDoublePeriod(true);
        final ClassSubject required = lesson(null, 4, teacher("Y"));
        required.setRequiresDoublePeriod(true);
        required.setAvoidDoublePeriod(true);

        assertEquals(List.of(3, 1, 1, 1, 1), Block.lengths(sized));
        assertEquals(List.of(2, 2), Block.lengths(required));
    }

    @Test
    public void roomWishIsTakenWhereItIsFree() {
        final Teacher wanting = teacher("RW");
        final Room lab = room("LAB");
        final SchoolClass a = schoolClass("1AHIF", room("RA"));
        final SchoolClass b = schoolClass("1BHIF", room("RB"));
        final ClassSubject wished = lesson(a, 4, wanting);
        // the same teacher's lab lesson in another class: never at the same hour
        final ClassSubject labLesson = lesson(b, 2, wanting);
        labLesson.getFixedRooms().add(lab);

        final Schedule schedule = Schedule.of(List.of(wished, labLesson));
        final List<String> problems = schedule.setWishes(SimulatedAnnealingAlgorithm.wishStateOf(
                List.of(profile("RW", wish(WishType.ROOM, WishDegree.MID, null, null, null, null, null, null,
                        "1AHIF", null, lab.getId()))),
                new ArrayList<>()));
        assertTrue(problems.isEmpty(), problems.toString());
        schedule.construct(new Random(1));

        final List<ClassSubjectInstance> inA = schedule.teacherTimetable(wanting, schedule.snapshot())
                .getClassSubjectInstances().stream()
                .filter(csi -> csi.getClassSubject() == wished)
                .toList();
        assertFalse(inA.isEmpty());
        inA.forEach(csi -> assertEquals("LAB", csi.getRoom().getNameShort()));
    }
}
