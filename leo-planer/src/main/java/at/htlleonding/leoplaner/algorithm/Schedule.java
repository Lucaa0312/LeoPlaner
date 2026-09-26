package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.HoursPeriod;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.Timetable;
import at.htlleonding.leoplaner.data.TimetableManager;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * The whole school's week as blocks on a grid of days and hours, with the
 * cost kept up to date move by move.
 *
 * Days are not packed to start at the first hour: a lesson coupling several
 * classes has to sit on the same hour in all of them, and packing each class
 * on its own would pull the copies apart. Free hours inside a day are priced
 * instead (CLASS_GAP), and the lunch break is the one free hour a long day
 * is allowed.
 *
 * Only the classes, teachers and rooms a move touches are re-costed, so a move
 * costs the same whether the school has five classes or seventy-five.
 */
public final class Schedule {

    static final SchoolDays[] DAYS = SchoolDays.schedulableDays();
    static final int DAY_COUNT = DAYS.length;
    /** hours run from 1, slot 0 is unused */
    static final int HOURS = TimetableManager.LAST_SCHOOL_HOUR + 1;
    private static final int SLOTS = DAY_COUNT * HOURS;

    private final List<SchoolClass> classes;
    private final List<Teacher> teachers;
    private final List<Room> rooms;
    private final List<Block> blocks;
    private final List<List<Block>> blocksOfClass = new ArrayList<>();
    private final List<List<Block>> blocksOfTeacher = new ArrayList<>();
    private final List<List<Block>> blocksOfRoom = new ArrayList<>();

    private final int[] classFirstHour;
    private final int[] classLastHour;
    private final long[][] nonWorking;
    private final long[][] nonPreferred;
    /** home rooms, the rooms a lesson without a fixed room can be taught in */
    private final boolean[] isPoolRoom;
    private final int poolSize;
    private final int groupCount;

    // occupancy: how many blocks cover each slot; for a class split by parallel group,
    // index 0 counting the lessons the whole class attends
    private final int[][][] classOcc;
    private final int[][] teacherOcc;
    private final int[][] roomOcc;
    /** blocks without a fixed room, each needing a classroom */
    private final int[] roomDemand;
    /** home rooms taken by a lesson with a fixed room */
    private final int[] poolTaken;

    private final long[] classCost;
    private final long[] teacherCost;
    private final long[] roomCost;
    private final long[] capacityCost = new long[DAY_COUNT];
    private long totalCost;

    // entities touched by the move being evaluated
    private final int[] classStamp;
    private final int[] teacherStamp;
    private final int[] roomStamp;
    private final int[] dayStamp = new int[DAY_COUNT];
    private int stamp;

    /** the steps of the move being evaluated, undone together on rollback */
    private final List<Frame> frames = new ArrayList<>();
    private int depth;

    /** blocks breaking a hard rule, refreshed now and then to aim moves at them */
    private List<Block> violating = List.of();
    private int proposals;

    /** returned by proposeAndApply when it found nothing to do */
    public static final long NO_MOVE = Long.MIN_VALUE;

    /** A proposed move: every listed block goes to its day and hour. */
    public record Move(Block[] blocks, int[] days, int[] hours) {
    }

    private static final class Frame {
        Block[] blocks;
        int[] oldDays;
        int[] oldHours;
        final List<long[]> saved = new ArrayList<>();
        final IntList classes = new IntList();
        final IntList teachers = new IntList();
        final IntList rooms = new IntList();
        final IntList days = new IntList();
        long delta;
    }

    private Schedule(final List<SchoolClass> classes, final List<Teacher> teachers, final List<Room> rooms,
            final List<Block> blocks, final int groupCount) {
        this.classes = classes;
        this.teachers = teachers;
        this.rooms = rooms;
        this.blocks = blocks;
        this.groupCount = groupCount;

        classFirstHour = new int[classes.size()];
        classLastHour = new int[classes.size()];
        for (int c = 0; c < classes.size(); c++) {
            classFirstHour[c] = Math.max(1, classes.get(c).getFirstHour());
            classLastHour[c] = Math.min(HOURS - 1, classes.get(c).getLastHour());
            blocksOfClass.add(new ArrayList<>());
        }

        nonWorking = new long[teachers.size()][];
        nonPreferred = new long[teachers.size()][];
        for (int t = 0; t < teachers.size(); t++) {
            nonWorking[t] = hourMask(teachers.get(t).getTeacher_non_working_hours());
            nonPreferred[t] = hourMask(teachers.get(t).getTeacher_non_preferred_hours());
            blocksOfTeacher.add(new ArrayList<>());
        }

        isPoolRoom = new boolean[rooms.size()];
        for (final SchoolClass schoolClass : classes) {
            final int r = indexOf(rooms, schoolClass.getClassRoom());
            if (r >= 0) {
                isPoolRoom[r] = true;
            }
        }
        int pool = 0;
        for (int r = 0; r < rooms.size(); r++) {
            blocksOfRoom.add(new ArrayList<>());
            if (isPoolRoom[r]) {
                pool++;
            }
        }
        poolSize = pool;

        for (final Block block : blocks) {
            for (final int c : block.classes) {
                blocksOfClass.get(c).add(block);
            }
            for (final int t : block.teachers) {
                blocksOfTeacher.get(t).add(block);
            }
            for (final int r : block.rooms) {
                blocksOfRoom.get(r).add(block);
            }
        }

        classOcc = new int[classes.size()][groupCount + 1][SLOTS];
        teacherOcc = new int[teachers.size()][SLOTS];
        roomOcc = new int[rooms.size()][SLOTS];
        roomDemand = new int[SLOTS];
        poolTaken = new int[SLOTS];
        classCost = new long[classes.size()];
        teacherCost = new long[teachers.size()];
        roomCost = new long[rooms.size()];
        classStamp = new int[classes.size()];
        teacherStamp = new int[teachers.size()];
        roomStamp = new int[rooms.size()];

        recomputeAll();
    }

    /**
     * Cuts the lessons into blocks. ClassSubjects sharing a coupling key are
     * one lesson and become the same blocks; the first of them decides the
     * hours and how they are cut, which the import keeps equal for all.
     */
    public static Schedule of(final List<ClassSubject> classSubjects) {
        final Map<Object, List<ClassSubject>> lessons = new LinkedHashMap<>();
        for (final ClassSubject cs : classSubjects) {
            if (cs.getSchoolClass() == null) {
                continue;
            }
            final Object key = cs.getCouplingKey() != null ? cs.getCouplingKey() : cs;
            lessons.computeIfAbsent(key, k -> new ArrayList<>()).add(cs);
        }

        final Indexer<SchoolClass> classes = new Indexer<>(SchoolClass::getId);
        final Indexer<Teacher> teachers = new Indexer<>(Teacher::getId);
        final Indexer<Room> rooms = new Indexer<>(Room::getId);
        final Map<String, Integer> groups = new LinkedHashMap<>();
        final List<Block> blocks = new ArrayList<>();

        for (final List<ClassSubject> members : lessons.values()) {
            final ClassSubject first = members.getFirst();
            final List<Integer> classIdx = new ArrayList<>();
            final List<Integer> teacherIdx = new ArrayList<>();
            final List<Integer> roomIdx = new ArrayList<>();
            int firstHour = 1;
            int lastHour = HOURS - 1;
            int unionFirst = HOURS - 1;
            int unionLast = 1;
            for (final ClassSubject member : members) {
                final SchoolClass schoolClass = member.getSchoolClass();
                addOnce(classIdx, classes.index(schoolClass));
                firstHour = Math.max(firstHour, schoolClass.getFirstHour());
                lastHour = Math.min(lastHour, schoolClass.getLastHour());
                unionFirst = Math.min(unionFirst, schoolClass.getFirstHour());
                unionLast = Math.max(unionLast, schoolClass.getLastHour());
                if (member.getTeachers() != null) {
                    for (final Teacher teacher : member.getTeachers()) {
                        if (teacher != null) {
                            addOnce(teacherIdx, teachers.index(teacher));
                        }
                    }
                }
                if (member.getFixedRooms() != null) {
                    for (final Room room : member.getFixedRooms()) {
                        if (room != null) {
                            addOnce(roomIdx, rooms.index(room));
                        }
                    }
                }
            }
            if (firstHour > lastHour) {
                // classes with windows that do not overlap cannot all be
                // served; the widest window at least keeps the block movable
                firstHour = Math.max(1, unionFirst);
                lastHour = Math.min(HOURS - 1, unionLast);
            }
            final int group = first.getParallelGroup() == null
                    ? 0
                    : groups.computeIfAbsent(first.getParallelGroup(), g -> groups.size() + 1);

            for (final int length : Block.lengths(first)) {
                blocks.add(new Block(blocks.size(), members,
                        Math.min(length, lastHour - firstHour + 1),
                        toArray(classIdx), toArray(teacherIdx), toArray(roomIdx), group, firstHour, lastHour));
            }
        }

        // every class's home room is a classroom, even one no lesson names
        for (final SchoolClass schoolClass : classes.items) {
            if (schoolClass.getClassRoom() != null) {
                rooms.index(schoolClass.getClassRoom());
            }
        }

        return new Schedule(classes.items, teachers.items, rooms.items, blocks, groups.size());
    }

    // ------------------------------------------------------------------
    // cost

    public synchronized long getTotalCost() {
        return totalCost;
    }

    /** Cost split by category, recomputed from scratch. */
    public synchronized CostBreakdown breakdown() {
        final CostBreakdown breakdown = new CostBreakdown();
        for (int c = 0; c < classes.size(); c++) {
            classCost(c, breakdown);
        }
        for (int t = 0; t < teachers.size(); t++) {
            teacherCost(t, breakdown);
        }
        for (int r = 0; r < rooms.size(); r++) {
            roomCost(r, breakdown);
        }
        for (int d = 0; d < DAY_COUNT; d++) {
            capacityCost(d, breakdown);
        }
        return breakdown;
    }

    /** How many hard rules are broken, counted in units of IMPOSSIBLE. */
    public long hardViolations() {
        long violations = 0;
        for (final Map.Entry<CostCategory, Long> entry : breakdown().asMap().entrySet()) {
            if (entry.getKey().isHard()) {
                violations += entry.getValue() / CostModel.IMPOSSIBLE_COST;
            }
        }
        return violations;
    }

    /**
     * Every broken hard rule as "what / who / DAY-hour", so a run that does
     * not get to zero says straight away whether the schedule is stuck or the
     * data cannot be satisfied.
     */
    public synchronized List<String> describeHardViolations() {
        final List<String> violations = new ArrayList<>();
        for (int d = 0; d < DAY_COUNT; d++) {
            for (int h = 1; h < HOURS; h++) {
                final int slot = d * HOURS + h;
                final String when = DAYS[d] + "-" + h;
                for (int t = 0; t < teachers.size(); t++) {
                    final int count = teacherOcc[t][slot];
                    if (count > 1) {
                        violations.add("teacher clash / " + teachers.get(t).getNameSymbol() + " / " + when
                                + " / " + lessonsAt(blocksOfTeacher.get(t), d, h));
                    }
                    if (count > 0 && (nonWorking[t][d] & (1L << h)) != 0) {
                        violations.add("teacher not working / " + teachers.get(t).getNameSymbol() + " / " + when
                                + " / " + lessonsAt(blocksOfTeacher.get(t), d, h));
                    }
                }
                for (int c = 0; c < classes.size(); c++) {
                    final int units = unitsAt(c, slot);
                    if (units > 1) {
                        violations.add("class clash / " + classes.get(c).getClassName() + " / " + when
                                + " / " + lessonsAt(blocksOfClass.get(c), d, h));
                    }
                    if (units > 0 && (h < classFirstHour[c] || h > classLastHour[c])) {
                        violations.add("outside window / " + classes.get(c).getClassName() + " / " + when);
                    }
                }
                for (int r = 0; r < rooms.size(); r++) {
                    if (roomOcc[r][slot] > 1) {
                        violations.add("room clash / " + rooms.get(r).getNameShort() + " / " + when
                                + " / " + lessonsAt(blocksOfRoom.get(r), d, h));
                    }
                }
                final int missing = roomDemand[slot] - (poolSize - poolTaken[slot]);
                if (missing > 0) {
                    violations.add("no classroom left / " + missing + " lessons / " + when);
                }
            }
        }
        return violations;
    }

    private static String lessonsAt(final List<Block> candidates, final int d, final int h) {
        final List<String> names = new ArrayList<>();
        for (final Block block : candidates) {
            if (block.day == d && h >= block.hour && h < block.hour + block.duration) {
                final ClassSubject first = block.members.getFirst();
                names.add((first.getCouplingKey() != null ? first.getCouplingKey() + " " : "")
                        + (first.getSubject() != null ? first.getSubject().getSubjectSymbol() : "?")
                        + " " + first.getSchoolClass().getClassName()
                        + (block.members.size() > 1 ? "+" + (block.members.size() - 1) : ""));
            }
        }
        return String.join(", ", names);
    }

    private void recomputeAll() {
        java.util.Arrays.stream(classOcc).forEach(g -> java.util.Arrays.stream(g).forEach(a -> java.util.Arrays.fill(a, 0)));
        java.util.Arrays.stream(teacherOcc).forEach(a -> java.util.Arrays.fill(a, 0));
        java.util.Arrays.stream(roomOcc).forEach(a -> java.util.Arrays.fill(a, 0));
        java.util.Arrays.fill(roomDemand, 0);
        java.util.Arrays.fill(poolTaken, 0);
        for (final Block block : blocks) {
            if (block.isPlaced()) {
                occupy(block, 1);
            }
        }
        totalCost = 0;
        for (int c = 0; c < classes.size(); c++) {
            totalCost += classCost[c] = classCost(c, null);
        }
        for (int t = 0; t < teachers.size(); t++) {
            totalCost += teacherCost[t] = teacherCost(t, null);
        }
        for (int r = 0; r < rooms.size(); r++) {
            totalCost += roomCost[r] = roomCost(r, null);
        }
        for (int d = 0; d < DAY_COUNT; d++) {
            totalCost += capacityCost[d] = capacityCost(d, null);
        }
    }

    private static long charge(final CostBreakdown breakdown, final CostCategory category, final long amount) {
        if (breakdown != null) {
            breakdown.add(category, amount);
        }
        return amount;
    }

    /** Parallel lessons of one group count as one; everything else counts on its own. */
    private int unitsAt(final int c, final int slot) {
        final int[][] occ = classOcc[c];
        int units = occ[0][slot];
        for (int g = 1; g <= groupCount; g++) {
            if (occ[g][slot] > 0) {
                units++;
            }
        }
        return units;
    }

    private long classCost(final int c, final CostBreakdown breakdown) {
        long cost = 0;
        final int[] hoursPerDay = new int[SchoolDays.values().length];

        for (int d = 0; d < DAY_COUNT; d++) {
            final SchoolDays day = DAYS[d];
            int lessonHours = 0;
            int first = -1;
            int last = -1;
            long clashes = 0;
            long outside = 0;
            for (int h = 1; h < HOURS; h++) {
                final int units = unitsAt(c, d * HOURS + h);
                if (units == 0) {
                    continue;
                }
                clashes += units - 1;
                if (h < classFirstHour[c] || h > classLastHour[c]) {
                    outside += units;
                }
                lessonHours++;
                if (first < 0) {
                    first = h;
                }
                last = h;
            }
            cost += charge(breakdown, CostCategory.CLASS_CLASH, clashes * CostModel.IMPOSSIBLE_COST);
            cost += charge(breakdown, CostCategory.OUTSIDE_WINDOW, outside * CostModel.IMPOSSIBLE_COST);
            hoursPerDay[day.ordinal()] = lessonHours;
            if (lessonHours == 0) {
                continue;
            }

            int free = last - first + 1 - lessonHours;
            final int lunch = lunchHour(c, d, lessonHours, first, last, null);
            if (lessonHours > CostModel.LUNCH_BREAK_MIN_DAY_HOURS) {
                if (lunch < 0) {
                    cost += charge(breakdown, CostCategory.LUNCH_BREAK_MISSING, CostModel.LUNCH_BREAK_MISSING_COST);
                } else {
                    free--;
                    cost += charge(breakdown, CostCategory.LUNCH_BREAK_POSITION,
                            CostModel.lunchBreakPosition(lunch - first + 1, lessonHours));
                }
            }
            cost += charge(breakdown, CostCategory.CLASS_GAP, free * CostModel.CLASS_GAP_COST);
            cost += charge(breakdown, CostCategory.LATE_START,
                    (long) Math.max(0, first - classFirstHour[c]) * CostModel.LATE_START_COST);
            cost += charge(breakdown, CostCategory.DAY_LENGTH, CostModel.dayLength(day, lessonHours));
        }
        cost += charge(breakdown, CostCategory.SUBJECT_SAME_DAY,
                sameDayRepeats(blocksOfClass.get(c)) * CostModel.SUBJECT_SAME_DAY_COST);
        cost += charge(breakdown, CostCategory.DAY_BALANCE, CostModel.dayBalance(hoursPerDay));

        for (final Block block : blocksOfClass.get(c)) {
            if (!block.isPlaced()) {
                continue;
            }
            final SchoolDays day = DAYS[block.day];
            cost += charge(breakdown, CostCategory.DAY_OF_WEEK, CostModel.costOfDay(day));
            cost += charge(breakdown, CostCategory.LATE_HOURS,
                    CostModel.classPosition(block.hour - classFirstHour[c] + 1, block.duration, day));
            if (block.betterDouble && block.duration == 1) {
                cost += charge(breakdown, CostCategory.DOUBLE_PERIOD, CostModel.MID_COST);
            }
        }
        return cost;
    }

    /**
     * How often a lesson comes back later on a day it was already taught,
     * counted per lesson and day as the runs of back-to-back hours minus one:
     * a single and a single right after it are just a double, a single in the
     * first and one in the seventh hour are a repeat.
     */
    private static long sameDayRepeats(final List<Block> classBlocks) {
        long repeats = 0;
        final int size = classBlocks.size();
        for (int i = 0; i < size; i++) {
            final Block a = classBlocks.get(i);
            if (!a.isPlaced()) {
                continue;
            }
            boolean firstOfLessonAndDay = true;
            long hoursOfDay = 0; // bit per hour this lesson covers on a's day
            for (int j = 0; j < size; j++) {
                final Block b = classBlocks.get(j);
                if (b.members != a.members || b.day != a.day) {
                    continue;
                }
                if (j < i) {
                    firstOfLessonAndDay = false; // counted when its first block came up
                    break;
                }
                for (int h = b.hour; h < b.hour + b.duration && h < 64; h++) {
                    hoursOfDay |= 1L << h;
                }
            }
            if (firstOfLessonAndDay) {
                // runs of set bits: count the bits whose lower neighbour is not set
                repeats += Long.bitCount(hoursOfDay & ~(hoursOfDay << 1)) - 1;
            }
        }
        return repeats;
    }

    /**
     * The free hour of a long day that serves as its lunch break: the one
     * inside the day closest to the ideal hour, or -1 when the day is short
     * or has no free hour. occupied overrides the live occupancy (views of a
     * snapshot); null reads the live one.
     */
    private int lunchHour(final int c, final int d, final int lessonHours, final int first, final int last,
            final boolean[] occupied) {
        if (lessonHours <= CostModel.LUNCH_BREAK_MIN_DAY_HOURS) {
            return -1;
        }
        final int ideal = first + CostModel.idealLunchBreakHour(lessonHours) - 1;
        int best = -1;
        for (int h = first + 1; h < last; h++) {
            final boolean busy = occupied != null ? occupied[h] : unitsAt(c, d * HOURS + h) > 0;
            if (!busy && (best < 0 || Math.abs(h - ideal) < Math.abs(best - ideal))) {
                best = h;
            }
        }
        return best;
    }

    private long teacherCost(final int t, final CostBreakdown breakdown) {
        long cost = 0;
        final int[] occ = teacherOcc[t];
        for (int d = 0; d < DAY_COUNT; d++) {
            int hours = 0;
            int first = -1;
            int last = -1;
            long clashes = 0;
            long nonWorkingHours = 0;
            long nonPreferredHours = 0;
            for (int h = 1; h < HOURS; h++) {
                final int count = occ[d * HOURS + h];
                if (count == 0) {
                    continue;
                }
                clashes += count - 1;
                if ((nonWorking[t][d] & (1L << h)) != 0) {
                    nonWorkingHours += count;
                } else if ((nonPreferred[t][d] & (1L << h)) != 0) {
                    nonPreferredHours += count;
                }
                hours++;
                if (first < 0) {
                    first = h;
                }
                last = h;
            }
            cost += charge(breakdown, CostCategory.TEACHER_CLASH, clashes * CostModel.IMPOSSIBLE_COST);
            cost += charge(breakdown, CostCategory.TEACHER_NON_WORKING, nonWorkingHours * CostModel.IMPOSSIBLE_COST);
            cost += charge(breakdown, CostCategory.TEACHER_NON_PREFERRED, nonPreferredHours * CostModel.SEVERE_COST);
            cost += charge(breakdown, CostCategory.TEACHER_SHORT_DAY, CostModel.teacherDayLength(hours));
            if (hours > 0) {
                cost += charge(breakdown, CostCategory.TEACHER_GAP,
                        (long) (last - first + 1 - hours) * CostModel.TEACHER_GAP_COST);
            }
        }
        return cost;
    }

    private long roomCost(final int r, final CostBreakdown breakdown) {
        long clashes = 0;
        for (final int count : roomOcc[r]) {
            if (count > 1) {
                clashes += count - 1;
            }
        }
        return charge(breakdown, CostCategory.ROOM_CLASH, clashes * CostModel.IMPOSSIBLE_COST);
    }

    private long capacityCost(final int d, final CostBreakdown breakdown) {
        long missing = 0;
        for (int h = 1; h < HOURS; h++) {
            final int slot = d * HOURS + h;
            missing += Math.max(0, roomDemand[slot] - (poolSize - poolTaken[slot]));
        }
        return charge(breakdown, CostCategory.ROOM_CAPACITY, missing * CostModel.ROOM_CAPACITY_COST);
    }

    private void occupy(final Block block, final int sign) {
        final int base = block.day * HOURS;
        for (int i = 0; i < block.duration; i++) {
            final int h = block.hour + i;
            if (h < 1 || h >= HOURS) {
                continue;
            }
            final int slot = base + h;
            for (final int c : block.classes) {
                classOcc[c][block.group][slot] += sign;
            }
            for (final int t : block.teachers) {
                teacherOcc[t][slot] += sign;
            }
            for (final int r : block.rooms) {
                final int before = roomOcc[r][slot];
                roomOcc[r][slot] += sign;
                if (isPoolRoom[r] && (before == 0) != (roomOcc[r][slot] == 0)) {
                    poolTaken[slot] += sign;
                }
            }
            if (block.rooms.length == 0) {
                roomDemand[slot] += sign;
            }
        }
    }

    // ------------------------------------------------------------------
    // moves

    /**
     * Puts the blocks of the move on their new positions and returns how the
     * total cost changes. Several moves can be applied one after the other;
     * commit keeps all of them, rollback undoes all of them.
     */
    public synchronized long apply(final Move move) {
        if (depth == frames.size()) {
            frames.add(new Frame());
        }
        final Frame frame = frames.get(depth++);
        final Block[] moved = move.blocks();
        stamp++;
        frame.classes.clear();
        frame.teachers.clear();
        frame.rooms.clear();
        frame.days.clear();
        frame.saved.clear();
        frame.blocks = moved;
        frame.oldDays = new int[moved.length];
        frame.oldHours = new int[moved.length];

        for (int i = 0; i < moved.length; i++) {
            final Block block = moved[i];
            frame.oldDays[i] = block.day;
            frame.oldHours[i] = block.hour;
            touch(frame, block);
            if (move.days()[i] >= 0) {
                touchDay(frame, move.days()[i]);
            }
        }

        long before = 0;
        for (int i = 0; i < frame.classes.size(); i++) {
            before += classCost[frame.classes.get(i)];
        }
        for (int i = 0; i < frame.teachers.size(); i++) {
            before += teacherCost[frame.teachers.get(i)];
        }
        for (int i = 0; i < frame.rooms.size(); i++) {
            before += roomCost[frame.rooms.get(i)];
        }
        for (int i = 0; i < frame.days.size(); i++) {
            before += capacityCost[frame.days.get(i)];
        }

        for (final Block block : moved) {
            if (block.isPlaced()) {
                occupy(block, -1);
            }
        }
        for (int i = 0; i < moved.length; i++) {
            moved[i].day = move.days()[i];
            moved[i].hour = move.hours()[i];
        }
        for (final Block block : moved) {
            if (block.isPlaced()) {
                occupy(block, 1);
            }
        }

        final long[] oldClass = new long[frame.classes.size()];
        final long[] oldTeacher = new long[frame.teachers.size()];
        final long[] oldRoom = new long[frame.rooms.size()];
        final long[] oldDay = new long[frame.days.size()];
        long after = 0;
        for (int i = 0; i < oldClass.length; i++) {
            final int c = frame.classes.get(i);
            oldClass[i] = classCost[c];
            after += classCost[c] = classCost(c, null);
        }
        for (int i = 0; i < oldTeacher.length; i++) {
            final int t = frame.teachers.get(i);
            oldTeacher[i] = teacherCost[t];
            after += teacherCost[t] = teacherCost(t, null);
        }
        for (int i = 0; i < oldRoom.length; i++) {
            final int r = frame.rooms.get(i);
            oldRoom[i] = roomCost[r];
            after += roomCost[r] = roomCost(r, null);
        }
        for (int i = 0; i < oldDay.length; i++) {
            final int d = frame.days.get(i);
            oldDay[i] = capacityCost[d];
            after += capacityCost[d] = capacityCost(d, null);
        }
        frame.saved.add(oldClass);
        frame.saved.add(oldTeacher);
        frame.saved.add(oldRoom);
        frame.saved.add(oldDay);

        frame.delta = after - before;
        totalCost += frame.delta;
        return frame.delta;
    }

    public synchronized void commit() {
        depth = 0;
    }

    public synchronized void rollback() {
        while (depth > 0) {
            undo(frames.get(--depth));
        }
    }

    /** Undoes only the last applied step and keeps the ones before it. */
    private void undoLast() {
        if (depth > 0) {
            undo(frames.get(--depth));
        }
    }

    private void undo(final Frame frame) {
        final Block[] moved = frame.blocks;
        for (final Block block : moved) {
            if (block.isPlaced()) {
                occupy(block, -1);
            }
        }
        for (int i = 0; i < moved.length; i++) {
            moved[i].day = frame.oldDays[i];
            moved[i].hour = frame.oldHours[i];
        }
        for (final Block block : moved) {
            if (block.isPlaced()) {
                occupy(block, 1);
            }
        }
        final long[] oldClass = frame.saved.get(0);
        final long[] oldTeacher = frame.saved.get(1);
        final long[] oldRoom = frame.saved.get(2);
        final long[] oldDay = frame.saved.get(3);
        for (int i = 0; i < oldClass.length; i++) {
            classCost[frame.classes.get(i)] = oldClass[i];
        }
        for (int i = 0; i < oldTeacher.length; i++) {
            teacherCost[frame.teachers.get(i)] = oldTeacher[i];
        }
        for (int i = 0; i < oldRoom.length; i++) {
            roomCost[frame.rooms.get(i)] = oldRoom[i];
        }
        for (int i = 0; i < oldDay.length; i++) {
            capacityCost[frame.days.get(i)] = oldDay[i];
        }
        totalCost -= frame.delta;
    }

    private void touch(final Frame frame, final Block block) {
        for (final int c : block.classes) {
            if (classStamp[c] != stamp) {
                classStamp[c] = stamp;
                frame.classes.add(c);
            }
        }
        for (final int t : block.teachers) {
            if (teacherStamp[t] != stamp) {
                teacherStamp[t] = stamp;
                frame.teachers.add(t);
            }
        }
        for (final int r : block.rooms) {
            if (roomStamp[r] != stamp) {
                roomStamp[r] = stamp;
                frame.rooms.add(r);
            }
        }
        if (block.isPlaced()) {
            touchDay(frame, block.day);
        }
    }

    private void touchDay(final Frame frame, final int d) {
        if (dayStamp[d] != stamp) {
            dayStamp[d] = stamp;
            frame.days.add(d);
        }
    }

    /**
     * Draws a random neighbour, applies it and returns how the cost changes,
     * or NO_MOVE when the drawn block had nowhere to go. Has to be followed by
     * commit or rollback like apply.
     *
     * While hard rules are broken, half of the moves are aimed at the blocks
     * breaking them - among a thousand blocks, ten stuck ones are otherwise
     * hardly ever drawn.
     */
    public synchronized long proposeAndApply(final Random random) {
        if (blocks.isEmpty()) {
            return NO_MOVE;
        }
        if (proposals++ % 256 == 0) {
            violating = totalCost >= CostModel.IMPOSSIBLE_COST ? findViolating() : List.of();
        }

        final Block block = !violating.isEmpty() && random.nextBoolean()
                ? violating.get(random.nextInt(violating.size()))
                : blocks.get(random.nextInt(blocks.size()));
        final double kind = random.nextDouble();

        Move move = null;
        if (kind < 0.25) {
            move = proposeSwap(block, random);
        } else if (kind < 0.30) {
            move = proposeDaySwap(block, random);
        } else if (kind < 0.45) {
            return ejectionChain(block, random);
        }
        if (move != null) {
            // a swap or a day swap often only works together with moving what
            // it now collides with, so half of them clear that up in the same step
            final long delta = apply(move);
            return random.nextBoolean() ? delta + pushOut(move.blocks(), random) : delta;
        }
        move = proposeRelocation(block, random);
        return move == null ? NO_MOVE : apply(move);
    }

    /** A random neighbour as a single move, without applying it. */
    public synchronized Move propose(final Random random) {
        if (blocks.isEmpty()) {
            return null;
        }
        final Block block = blocks.get(random.nextInt(blocks.size()));
        if (random.nextDouble() < 0.3) {
            final Move swap = proposeSwap(block, random);
            if (swap != null) {
                return swap;
            }
        }
        return proposeRelocation(block, random);
    }

    private List<Block> findViolating() {
        final List<Block> result = new ArrayList<>();
        for (final Block block : blocks) {
            if (block.isPlaced() && breaksHardRule(block)) {
                result.add(block);
            }
        }
        return result;
    }

    private boolean breaksHardRule(final Block block) {
        for (int h = block.hour; h < block.hour + block.duration; h++) {
            final int slot = block.day * HOURS + h;
            if (h < block.firstHour || h > block.lastHour) {
                return true;
            }
            for (final int c : block.classes) {
                if (unitsAt(c, slot) > 1) {
                    return true;
                }
            }
            for (final int t : block.teachers) {
                if (teacherOcc[t][slot] > 1 || (nonWorking[t][block.day] & (1L << h)) != 0) {
                    return true;
                }
            }
            for (final int r : block.rooms) {
                if (roomOcc[r][slot] > 1) {
                    return true;
                }
            }
            if (block.rooms.length == 0 && roomDemand[slot] > poolSize - poolTaken[slot]) {
                return true;
            }
        }
        return false;
    }

    private Move proposeSwap(final Block a, final Random random) {
        if (!a.isPlaced() || a.classes.length == 0) {
            return null;
        }
        final List<Block> sameClass = blocksOfClass.get(a.classes[random.nextInt(a.classes.length)]);
        final List<Block> partners = new ArrayList<>();
        for (final Block b : sameClass) {
            if (b != a && b.isPlaced() && b.duration == a.duration && (b.day != a.day || b.hour != a.hour)) {
                partners.add(b);
            }
        }
        if (partners.isEmpty()) {
            return null;
        }
        final Block b = partners.get(random.nextInt(partners.size()));
        return new Move(new Block[] { a, b }, new int[] { b.day, a.day }, new int[] { b.hour, a.hour });
    }

    /**
     * Swaps two whole days of one of the block's classes, keeping every hour.
     * Lessons shared with other classes go along, so this can break those
     * classes' days - the cost decides. Rebuilds a week in one step that
     * single moves could only reach through many bad intermediate ones.
     */
    private Move proposeDaySwap(final Block block, final Random random) {
        if (!block.isPlaced() || block.classes.length == 0) {
            return null;
        }
        final int c = block.classes[random.nextInt(block.classes.length)];
        final int other = random.nextInt(DAY_COUNT - 1);
        final int d2 = other >= block.day ? other + 1 : other;
        final List<Block> moved = new ArrayList<>();
        for (final Block b : blocksOfClass.get(c)) {
            if (b.day == block.day || b.day == d2) {
                moved.add(b);
            }
        }
        final Block[] array = moved.toArray(new Block[0]);
        final int[] days = new int[array.length];
        final int[] hours = new int[array.length];
        for (int i = 0; i < array.length; i++) {
            days[i] = array[i].day == block.day ? d2 : block.day;
            hours[i] = array[i].hour;
        }
        return new Move(array, days, hours);
    }

    /**
     * Moves the block to any hour of its window, taking the place of whatever
     * sits there, and then moves each lesson it pushed out to a free hour of
     * its own. Judged as one move: a long block that can only fit where a
     * class already has lessons gets there in one step instead of never.
     */
    private long ejectionChain(final Block block, final Random random) {
        final List<Integer> targets = candidatesIgnoringClasses(block);
        if (targets.isEmpty()) {
            return NO_MOVE;
        }
        final int target = targets.get(random.nextInt(targets.size()));
        return apply(single(block, target)) + pushOut(new Block[] { block }, random);
    }

    /**
     * Moves every lesson that now collides with one of the moved blocks - in
     * a class, with a teacher or in a room - to a free hour of its own, and
     * returns what that changed. A lesson with no free hour left stays where
     * it is and the cost says whether the whole move is still worth it.
     */
    private long pushOut(final Block[] moved, final Random random) {
        final List<Block> pushedOut = new ArrayList<>();
        final java.util.Set<Block> movedSet = java.util.Collections.newSetFromMap(new IdentityHashMap<>());
        movedSet.addAll(java.util.Arrays.asList(moved));
        for (final Block block : moved) {
            for (final int c : block.classes) {
                for (final Block other : blocksOfClass.get(c)) {
                    if (!movedSet.contains(other) && overlaps(other, block) && !pushedOut.contains(other)
                            && (other.group == 0 || other.group != block.group)) {
                        pushedOut.add(other);
                    }
                }
            }
            for (final int t : block.teachers) {
                for (final Block other : blocksOfTeacher.get(t)) {
                    if (!movedSet.contains(other) && overlaps(other, block) && !pushedOut.contains(other)) {
                        pushedOut.add(other);
                    }
                }
            }
            for (final int r : block.rooms) {
                for (final Block other : blocksOfRoom.get(r)) {
                    if (!movedSet.contains(other) && overlaps(other, block) && !pushedOut.contains(other)) {
                        pushedOut.add(other);
                    }
                }
            }
        }

        long delta = 0;
        java.util.Collections.shuffle(pushedOut, random);
        for (final Block other : pushedOut) {
            List<Integer> free = candidates(other, true);
            if (free.isEmpty()) {
                free = candidates(other, false);
            }
            if (free.isEmpty()) {
                continue;
            }
            final List<Integer> adjacent = new ArrayList<>();
            for (final int slot : free) {
                if (isNextToClassLessons(other, slot / HOURS, slot % HOURS)) {
                    adjacent.add(slot);
                }
            }
            final List<Integer> pick = adjacent.isEmpty() ? free : adjacent;
            delta += apply(single(other, pick.get(random.nextInt(pick.size()))));
        }
        return delta;
    }

    private static boolean overlaps(final Block a, final Block b) {
        return a.isPlaced() && b.isPlaced() && a.day == b.day
                && a.hour < b.hour + b.duration && b.hour < a.hour + a.duration;
    }

    /** Hours the block's teachers can take and its rooms are free, whatever its classes have there. */
    private List<Integer> candidatesIgnoringClasses(final Block block) {
        final List<Integer> result = new ArrayList<>();
        for (int d = 0; d < DAY_COUNT; d++) {
            for (int h = block.firstHour; h + block.duration - 1 <= block.lastHour; h++) {
                if (d == block.day && h == block.hour) {
                    continue;
                }
                boolean fits = true;
                for (int i = h; i < h + block.duration && fits; i++) {
                    for (final int t : block.teachers) {
                        if ((nonWorking[t][d] & (1L << i)) != 0) {
                            fits = false;
                        }
                    }
                    for (final int r : block.rooms) {
                        if (roomOcc[r][d * HOURS + i] - own(block, d, i) > 0) {
                            fits = false;
                        }
                    }
                }
                if (fits) {
                    result.add(d * HOURS + h);
                }
            }
        }
        return result;
    }

    /**
     * Moves the block to an hour that is free for all its classes, teachers and
     * rooms and that its teachers work. Most of the time it prefers an hour
     * next to the lessons its class already has on that day, so the move
     * does not tear a hole into the day; a free hour far off in an empty
     * afternoon is almost never an improvement.
     *
     * Falls back to hours that only keep the classes and teachers free, and
     * then to any hour, so a block that can go nowhere legal still moves and
     * the cost function gets a chance to weigh it.
     */
    private Move proposeRelocation(final Block block, final Random random) {
        List<Integer> candidates = candidates(block, true);
        if (candidates.isEmpty()) {
            candidates = candidates(block, false);
        }
        if (candidates.isEmpty()) {
            candidates = new ArrayList<>();
            for (int d = 0; d < DAY_COUNT; d++) {
                for (int h = block.firstHour; h + block.duration - 1 <= block.lastHour; h++) {
                    if (d != block.day || h != block.hour) {
                        candidates.add(d * HOURS + h);
                    }
                }
            }
        }
        if (candidates.isEmpty()) {
            return null;
        }

        if (random.nextDouble() < 0.7) {
            final List<Integer> adjacent = new ArrayList<>();
            for (final int slot : candidates) {
                if (isNextToClassLessons(block, slot / HOURS, slot % HOURS)) {
                    adjacent.add(slot);
                }
            }
            if (!adjacent.isEmpty()) {
                candidates = adjacent;
            }
        }
        final int slot = candidates.get(random.nextInt(candidates.size()));
        return new Move(new Block[] { block }, new int[] { slot / HOURS }, new int[] { slot % HOURS });
    }

    /** Positions (day * HOURS + hour) the block could move to without a clash. */
    List<Integer> candidates(final Block block, final boolean strict) {
        final List<Integer> result = new ArrayList<>();
        for (int d = 0; d < DAY_COUNT; d++) {
            for (int h = block.firstHour; h + block.duration - 1 <= block.lastHour; h++) {
                if ((d != block.day || h != block.hour) && fits(block, d, h, strict)) {
                    result.add(d * HOURS + h);
                }
            }
        }
        return result;
    }

    /** How much of slot is covered by the block itself, to look past it. */
    private int own(final Block block, final int d, final int h) {
        return block.day == d && h >= block.hour && h < block.hour + block.duration ? 1 : 0;
    }

    private boolean fits(final Block block, final int d, final int start, final boolean strict) {
        for (int h = start; h < start + block.duration; h++) {
            final int slot = d * HOURS + h;
            final int own = own(block, d, h);
            for (final int c : block.classes) {
                final int[][] occ = classOcc[c];
                for (int g = 0; g <= groupCount; g++) {
                    final int others = occ[g][slot] - (g == block.group ? own : 0);
                    // lessons of the block's own parallel group may share the hour
                    if (others > 0 && (g != block.group || g == 0)) {
                        return false;
                    }
                }
            }
            for (final int t : block.teachers) {
                if (teacherOcc[t][slot] - own > 0) {
                    return false;
                }
                if (strict && (nonWorking[t][d] & (1L << h)) != 0) {
                    return false;
                }
            }
            if (strict) {
                for (final int r : block.rooms) {
                    if (roomOcc[r][slot] - own > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private boolean isNextToClassLessons(final Block block, final int d, final int start) {
        final int c = block.classes[0];
        boolean dayEmpty = true;
        for (int h = 1; h < HOURS; h++) {
            if (unitsAt(c, d * HOURS + h) - own(block, d, h) > 0) {
                dayEmpty = false;
                break;
            }
        }
        if (dayEmpty) {
            return start == classFirstHour[c];
        }
        final int before = start - 1;
        final int after = start + block.duration;
        return (before >= 1 && unitsAt(c, d * HOURS + before) - own(block, d, before) > 0)
                || (after < HOURS && unitsAt(c, d * HOURS + after) - own(block, d, after) > 0);
    }

    // ------------------------------------------------------------------
    // starting schedule

    /** Blocks this long are the ones the greedy start cannot be trusted with. */
    static final int LONG_BLOCK = 3;

    /**
     * The exact placement gets several short tries rather than one long one:
     * a search that took a wrong turn early rarely recovers, a fresh start
     * with other tie-breaks usually just succeeds.
     */
    static final int EXACT_SEARCH_TRIES = 20;
    static final int EXACT_SEARCH_BUDGET = 3_000;

    /**
     * Places every block. The long blocks (workshops) and every block sharing
     * a teacher or a room with one are placed first by an exact search: the
     * block with the fewest free hours left goes next, each at the hour that
     * adds the least cost, backtracking when a block has no free hour at all.
     * A handful of eight hour days with the same teachers leaves no room for
     * guessing - a greedy start put them into clashes that no later move
     * could take apart.
     *
     * Everything else follows greedily, hardest first (see difficulty), each
     * block where it adds the least cost among the hours free for it; only
     * when there is none are clashes allowed, and then the cheapest one.
     */
    public synchronized void construct(final Random random) {
        for (final Block block : blocks) {
            block.day = -1;
        }
        depth = 0;
        recomputeAll();

        final List<Block> tight = tightBlocks();
        java.util.Collections.shuffle(tight, random);
        for (int attempt = 0; attempt < EXACT_SEARCH_TRIES; attempt++) {
            final int[] budget = { EXACT_SEARCH_BUDGET };
            if (placeExactly(new ArrayList<>(tight), random, budget)) {
                break;
            }
            rollback(); // out of budget: the next try, or the greedy way for all
        }
        commit();

        final List<Block> order = new ArrayList<>();
        for (final Block block : blocks) {
            if (!block.isPlaced()) {
                order.add(block);
            }
        }
        java.util.Collections.shuffle(order, random);
        order.sort(Comparator.comparingInt(Schedule::difficulty).reversed());

        for (final Block block : order) {
            List<Integer> candidates = candidates(block, true);
            if (candidates.isEmpty()) {
                candidates = candidates(block, false);
            }
            if (candidates.isEmpty()) {
                candidates = new ArrayList<>();
                for (int d = 0; d < DAY_COUNT; d++) {
                    for (int h = block.firstHour; h + block.duration - 1 <= block.lastHour; h++) {
                        candidates.add(d * HOURS + h);
                    }
                }
            }
            if (candidates.isEmpty()) {
                // longer than its window: put it at the start, the cost shows it
                candidates = List.of(block.firstHour);
            }

            long bestDelta = Long.MAX_VALUE;
            int best = candidates.getFirst();
            for (final int slot : candidates) {
                final long delta = apply(single(block, slot));
                rollback();
                if (delta < bestDelta) {
                    bestDelta = delta;
                    best = slot;
                }
            }
            apply(single(block, best));
            commit();
        }
    }

    /**
     * A block whose teachers leave it this few hours of the week to start in
     * is placed exactly too: with one or two legal hours, whatever else the
     * greedy start put there first blocks it for good.
     */
    static final int FEW_POSITIONS = 6;

    /**
     * The long blocks, the blocks their teachers' availability leaves almost
     * no hour for, and every block that shares a teacher or a room with one
     * of those.
     */
    private List<Block> tightBlocks() {
        final java.util.Set<Block> tight = new java.util.LinkedHashSet<>();
        for (final Block block : blocks) {
            if (block.duration < LONG_BLOCK && workablePositions(block) > FEW_POSITIONS) {
                continue;
            }
            tight.add(block);
            for (final int t : block.teachers) {
                tight.addAll(blocksOfTeacher.get(t));
            }
            for (final int r : block.rooms) {
                tight.addAll(blocksOfRoom.get(r));
            }
        }
        return new ArrayList<>(tight);
    }

    /** Start hours in the block's window at which all its teachers work every hour it spans. */
    private int workablePositions(final Block block) {
        int count = 0;
        for (int d = 0; d < DAY_COUNT; d++) {
            for (int h = block.firstHour; h + block.duration - 1 <= block.lastHour; h++) {
                boolean working = true;
                for (int i = h; i < h + block.duration && working; i++) {
                    for (final int t : block.teachers) {
                        if ((nonWorking[t][d] & (1L << i)) != 0) {
                            working = false;
                            break;
                        }
                    }
                }
                if (working) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Backtracking search over the open blocks, most constrained first. Each
     * placement stays applied while the search goes deeper and is undone with
     * undoLast when it leads nowhere. Returns false once the budget is used up.
     */
    private boolean placeExactly(final List<Block> open, final Random random, final int[] budget) {
        if (open.isEmpty()) {
            return true;
        }
        if (budget[0]-- <= 0) {
            return false;
        }

        Block next = null;
        List<Integer> nextCandidates = null;
        for (final Block block : open) {
            final List<Integer> candidates = candidates(block, true);
            if (next == null || candidates.size() < nextCandidates.size()
                    || (candidates.size() == nextCandidates.size() && difficulty(block) > difficulty(next))) {
                next = block;
                nextCandidates = candidates;
                if (candidates.isEmpty()) {
                    return false; // dead end, the caller tries its next hour
                }
            }
        }

        final Block block = next;
        final List<long[]> ranked = new ArrayList<>();
        java.util.Collections.shuffle(nextCandidates, random);
        for (final int slot : nextCandidates) {
            final long delta = apply(single(block, slot));
            undoLast();
            ranked.add(new long[] { delta, slot });
        }
        ranked.sort(Comparator.comparingLong(pair -> pair[0]));

        open.remove(block);
        for (final long[] pair : ranked) {
            apply(single(block, (int) pair[1]));
            if (placeExactly(open, random, budget)) {
                return true;
            }
            undoLast();
            if (budget[0] <= 0) {
                break;
            }
        }
        open.add(block);
        return false;
    }

    /**
     * How hard a block is to place late: every hour it spans has to be free
     * for every class, teacher and room it needs at once. A five hour
     * workshop with three teachers and three rooms left for the end finds no
     * free day anymore, while a single hour always fits somewhere.
     */
    static int difficulty(final Block block) {
        return block.duration * (block.classes.length + block.teachers.length + block.rooms.length);
    }

    private static Move single(final Block block, final int slot) {
        return new Move(new Block[] { block }, new int[] { slot / HOURS }, new int[] { slot % HOURS });
    }

    // ------------------------------------------------------------------
    // snapshots and views

    /** Every block's position as day * HOURS + hour, -1 for unplaced ones. */
    public synchronized int[] snapshot() {
        final int[] positions = new int[blocks.size()];
        for (final Block block : blocks) {
            positions[block.index] = block.isPlaced() ? block.day * HOURS + block.hour : -1;
        }
        return positions;
    }

    public synchronized void restore(final int[] positions) {
        depth = 0;
        for (final Block block : blocks) {
            final int position = positions[block.index];
            block.day = position < 0 ? -1 : position / HOURS;
            block.hour = position < 0 ? 0 : position % HOURS;
        }
        recomputeAll();
    }

    public List<Block> getBlocks() {
        return blocks;
    }

    public List<SchoolClass> getClasses() {
        return classes;
    }

    /**
     * Gives every block a room for the views, keeping classes in one room as
     * much as possible:
     * - a lesson with a fixed room gets it;
     * - then every lesson gets the home room of one of its classes where that
     *   is free for all its hours;
     * - the rest (classes without a home room, or whose home room another
     *   class sharing it has) first try the room their class was in earlier
     *   that day, and otherwise take the free classroom that stays free the
     *   longest after them, so the next lesson can stay there too.
     * The capacity cost keeps the classrooms from running out; a block that
     * still finds none keeps null.
     */
    Room[] allocateRooms(final int[] positions) {
        final Room[] result = new Room[blocks.size()];
        final Map<Room, boolean[]> busy = new IdentityHashMap<>();
        final List<Room> pool = new ArrayList<>();
        for (int r = 0; r < rooms.size(); r++) {
            if (isPoolRoom[r]) {
                pool.add(rooms.get(r));
            }
        }

        final List<Block> ordered = new ArrayList<>();
        for (final Block block : blocks) {
            if (positions[block.index] < 0) {
                continue;
            }
            if (block.rooms.length > 0) {
                result[block.index] = rooms.get(block.rooms[0]);
                for (final int r : block.rooms) {
                    reserve(busy, rooms.get(r), positions[block.index], block.duration);
                }
            } else {
                ordered.add(block);
            }
        }
        ordered.sort(Comparator.comparingInt(b -> positions[b.index]));

        final List<Block> homeless = new ArrayList<>();
        for (final Block block : ordered) {
            final int position = positions[block.index];
            Room chosen = null;
            for (final int c : block.classes) {
                final Room home = classes.get(c).getClassRoom();
                if (home != null && isFree(busy, home, position, block.duration)) {
                    chosen = home;
                    break;
                }
            }
            if (chosen == null) {
                homeless.add(block);
            } else {
                reserve(busy, chosen, position, block.duration);
                result[block.index] = chosen;
            }
        }

        // the room each class last sat in on each day, for lessons without a home room
        final Room[][] roomOfDay = new Room[classes.size()][DAY_COUNT];
        for (final Block block : homeless) {
            final int position = positions[block.index];
            final int d = position / HOURS;
            Room chosen = null;
            for (final int c : block.classes) {
                final Room earlier = roomOfDay[c][d];
                if (earlier != null && isFree(busy, earlier, position, block.duration)) {
                    chosen = earlier;
                    break;
                }
            }
            if (chosen == null) {
                int longest = -1;
                for (final Room room : pool) {
                    if (isFree(busy, room, position, block.duration)) {
                        final int freeAfter = freeRun(busy, room, position + block.duration, (d + 1) * HOURS);
                        if (freeAfter > longest) {
                            longest = freeAfter;
                            chosen = room;
                        }
                    }
                }
            }
            if (chosen != null) {
                reserve(busy, chosen, position, block.duration);
                for (final int c : block.classes) {
                    roomOfDay[c][d] = chosen;
                }
            }
            result[block.index] = chosen;
        }

        for (final Block block : homeless) {
            if (result[block.index] == null) {
                makeRoomFor(block, positions, result, busy, pool);
            }
        }
        return result;
    }

    /**
     * Frees a classroom for a block that found none: every hour has enough
     * classrooms, but lessons handed out earlier can leave each room free for
     * only part of a double. Looks for a room whose lessons in the way can all
     * move to another free room, and moves them.
     */
    private void makeRoomFor(final Block block, final int[] positions, final Room[] result,
            final Map<Room, boolean[]> busy, final List<Room> pool) {
        final int position = positions[block.index];
        for (final Room room : pool) {
            final List<Block> inTheWay = new ArrayList<>();
            boolean movable = true;
            for (final Block other : blocks) {
                final int otherPosition = positions[other.index];
                if (result[other.index] != room || otherPosition < 0
                        || otherPosition >= position + block.duration || position >= otherPosition + other.duration) {
                    continue;
                }
                if (other.rooms.length > 0) {
                    movable = false; // a fixed room stays taken
                    break;
                }
                inTheWay.add(other);
            }
            if (!movable || !isFreeExcept(busy, room, position, block.duration, inTheWay, positions)) {
                continue;
            }

            for (final Block other : inTheWay) {
                release(busy, room, positions[other.index], other.duration);
            }
            reserve(busy, room, position, block.duration);
            final Map<Block, Room> moved = new IdentityHashMap<>();
            for (final Block other : inTheWay) {
                final Room target = pool.stream()
                        .filter(r -> r != room && isFree(busy, r, positions[other.index], other.duration))
                        .findFirst()
                        .orElse(null);
                if (target == null) {
                    break;
                }
                reserve(busy, target, positions[other.index], other.duration);
                moved.put(other, target);
            }
            if (moved.size() == inTheWay.size()) {
                moved.forEach((other, target) -> result[other.index] = target);
                result[block.index] = room;
                return;
            }
            // undo and try the next room
            moved.forEach((other, target) -> release(busy, target, positions[other.index], other.duration));
            release(busy, room, position, block.duration);
            for (final Block other : inTheWay) {
                reserve(busy, room, positions[other.index], other.duration);
            }
        }
    }

    /** Whether the room is free for the block's hours once the given blocks are out of it. */
    private static boolean isFreeExcept(final Map<Room, boolean[]> busy, final Room room, final int position,
            final int duration, final List<Block> leaving, final int[] positions) {
        final boolean[] slots = busy.get(room);
        if (slots == null) {
            return true;
        }
        for (int slot = position; slot < position + duration; slot++) {
            if (!slots[slot]) {
                continue;
            }
            boolean freedByLeaving = false;
            for (final Block other : leaving) {
                if (slot >= positions[other.index] && slot < positions[other.index] + other.duration) {
                    freedByLeaving = true;
                    break;
                }
            }
            if (!freedByLeaving) {
                return false;
            }
        }
        return true;
    }

    private static void release(final Map<Room, boolean[]> busy, final Room room, final int position,
            final int duration) {
        final boolean[] slots = busy.get(room);
        for (int i = 0; slots != null && i < duration && position + i < SLOTS; i++) {
            slots[position + i] = false;
        }
    }

    /** How many slots from from on (up to end, exclusive) the room is still free. */
    private static int freeRun(final Map<Room, boolean[]> busy, final Room room, final int from, final int end) {
        final boolean[] slots = busy.get(room);
        int run = 0;
        for (int slot = from; slot < end && (slots == null || !slots[slot]); slot++) {
            run++;
        }
        return run;
    }

    private static boolean isFree(final Map<Room, boolean[]> busy, final Room room, final int position,
            final int duration) {
        final boolean[] slots = busy.get(room);
        if (slots == null) {
            return true;
        }
        for (int i = 0; i < duration; i++) {
            if (position + i < slots.length && slots[position + i]) {
                return false;
            }
        }
        return true;
    }

    private static void reserve(final Map<Room, boolean[]> busy, final Room room, final int position,
            final int duration) {
        final boolean[] slots = busy.computeIfAbsent(room, r -> new boolean[SLOTS]);
        for (int i = 0; i < duration && position + i < SLOTS; i++) {
            slots[position + i] = true;
        }
    }

    /**
     * Every class's timetable as the rest of the application knows it: one
     * instance per lesson hour block and class, plus a lunch break placeholder
     * on each long day. Built from positions so a snapshot can be shown while
     * the live schedule keeps moving.
     */
    public Map<String, Timetable> toTimetables(final int[] positions, final long cost) {
        final Room[] roomOf = allocateRooms(positions);
        final Map<String, Timetable> result = new LinkedHashMap<>();
        for (int c = 0; c < classes.size(); c++) {
            final SchoolClass schoolClass = classes.get(c);
            final List<ClassSubjectInstance> instances = new ArrayList<>();
            final boolean[][] occupied = new boolean[DAY_COUNT][HOURS];
            int weeklyHours = 0;
            for (final Block block : blocksOfClass.get(c)) {
                final int position = positions[block.index];
                if (position < 0) {
                    continue;
                }
                final int d = position / HOURS;
                final int h = position % HOURS;
                instances.add(new ClassSubjectInstance(block.memberOf(schoolClass), new Period(DAYS[d], h),
                        roomOf[block.index], block.duration));
                for (int i = 0; i < block.duration && h + i < HOURS; i++) {
                    if (!occupied[d][h + i]) {
                        weeklyHours++;
                    }
                    occupied[d][h + i] = true;
                }
            }
            for (int d = 0; d < DAY_COUNT; d++) {
                int lessonHours = 0;
                int first = -1;
                int last = -1;
                for (int h = 1; h < HOURS; h++) {
                    if (occupied[d][h]) {
                        lessonHours++;
                        first = first < 0 ? h : first;
                        last = h;
                    }
                }
                final int lunch = lessonHours > 0 ? lunchHour(c, d, lessonHours, first, last, occupied[d]) : -1;
                if (lunch > 0) {
                    instances.add(new ClassSubjectInstance(null, new Period(DAYS[d], lunch, true), null, 1));
                }
            }
            instances.sort(Comparator.comparing((ClassSubjectInstance csi) -> csi.getPeriod().getSchoolDays())
                    .thenComparingInt(csi -> csi.getPeriod().getSchoolHour()));
            final Timetable timetable = new Timetable(instances, schoolClass);
            timetable.setTotalWeeklyHours(weeklyHours);
            timetable.setCostOfTimetable(cost);
            result.put(schoolClass.getClassName(), timetable);
        }
        return result;
    }

    /** A teacher's week: each lesson once, however many classes it couples. */
    public Timetable teacherTimetable(final Teacher teacher, final int[] positions) {
        final Room[] roomOf = allocateRooms(positions);
        final List<ClassSubjectInstance> instances = new ArrayList<>();
        for (int t = 0; t < teachers.size(); t++) {
            if (!sameEntity(teachers.get(t), teacher, Teacher::getId)) {
                continue;
            }
            for (final Block block : blocksOfTeacher.get(t)) {
                addInstance(instances, block, positions, roomOf);
            }
        }
        return new Timetable(instances);
    }

    /** What is taught in a room, fixed or allocated. */
    public Timetable roomTimetable(final Room room, final int[] positions) {
        final Room[] roomOf = allocateRooms(positions);
        final List<ClassSubjectInstance> instances = new ArrayList<>();
        for (final Block block : blocks) {
            boolean inRoom = roomOf[block.index] != null && sameEntity(roomOf[block.index], room, Room::getId);
            for (final int r : block.rooms) {
                inRoom |= sameEntity(rooms.get(r), room, Room::getId);
            }
            if (inRoom) {
                addInstance(instances, block, positions, roomOf);
            }
        }
        return new Timetable(instances);
    }

    private static void addInstance(final List<ClassSubjectInstance> instances, final Block block,
            final int[] positions, final Room[] roomOf) {
        final int position = positions[block.index];
        if (position < 0) {
            return;
        }
        instances.add(new ClassSubjectInstance(block.members.getFirst(),
                new Period(DAYS[position / HOURS], position % HOURS), roomOf[block.index], block.duration));
    }

    // ------------------------------------------------------------------
    // helpers

    private static <T> boolean sameEntity(final T a, final T b, final java.util.function.Function<T, Long> id) {
        if (a == b) {
            return true;
        }
        return a != null && b != null && id.apply(a) != null && id.apply(a).equals(id.apply(b));
    }

    private static int indexOf(final List<Room> rooms, final Room room) {
        if (room == null) {
            return -1;
        }
        for (int i = 0; i < rooms.size(); i++) {
            if (sameEntity(rooms.get(i), room, Room::getId)) {
                return i;
            }
        }
        return -1;
    }

    /** One long per day, bit n set when hour n is in the list. */
    private static long[] hourMask(final List<? extends HoursPeriod> hours) {
        final long[] mask = new long[DAY_COUNT];
        if (hours == null) {
            return mask;
        }
        for (final HoursPeriod hour : hours) {
            if (hour == null || hour.getDay() == null || hour.getSchoolHour() == null
                    || !hour.getDay().isSchedulable() || hour.getSchoolHour() < 0 || hour.getSchoolHour() > 63) {
                continue;
            }
            mask[hour.getDay().ordinal()] |= 1L << hour.getSchoolHour();
        }
        return mask;
    }

    private static void addOnce(final List<Integer> list, final int value) {
        if (!list.contains(value)) {
            list.add(value);
        }
    }

    private static int[] toArray(final List<Integer> list) {
        return list.stream().mapToInt(Integer::intValue).toArray();
    }

    /**
     * Numbers entities in the order they are met. Keyed by id when there is
     * one - the entities carry no equals(), and the same teacher loaded twice
     * must not become two teachers - and by identity otherwise.
     */
    private static final class Indexer<T> {
        final List<T> items = new ArrayList<>();
        final Map<Object, Integer> byKey = new java.util.HashMap<>();
        final Map<T, Integer> byIdentity = new IdentityHashMap<>();
        final java.util.function.Function<T, Long> id;

        Indexer(final java.util.function.Function<T, Long> id) {
            this.id = id;
        }

        int index(final T item) {
            final Long key = id.apply(item);
            final Integer known = key != null ? byKey.get(key) : byIdentity.get(item);
            if (known != null) {
                return known;
            }
            items.add(item);
            final int index = items.size() - 1;
            if (key != null) {
                byKey.put(key, index);
            } else {
                byIdentity.put(item, index);
            }
            return index;
        }
    }

    /** A growable int list that is cleared, not reallocated, on every move. */
    private static final class IntList {
        private int[] values = new int[16];
        private int size;

        void add(final int value) {
            if (size == values.length) {
                values = java.util.Arrays.copyOf(values, size * 2);
            }
            values[size++] = value;
        }

        int get(final int index) {
            return values[index];
        }

        int size() {
            return size;
        }

        void clear() {
            size = 0;
        }
    }
}
