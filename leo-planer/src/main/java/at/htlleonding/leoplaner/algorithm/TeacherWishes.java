package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.TeacherWishProfile;
import at.htlleonding.leoplaner.data.TeacherWishProfile.DoublePeriodMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.LinkMode;
import at.htlleonding.leoplaner.data.TeacherWishProfile.TeacherWish;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishDegree;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The teachers' wishes compiled against one Schedule's indexes, so the
 * Schedule can price them the way it prices everything else: a teacher's
 * wishes with that teacher's cost, a link between two teachers as a cost of
 * its own, each recomputed only when a move touches it.
 *
 * Which wishes are valid and what they weigh is decided before, in
 * SimulatedAnnealingAlgorithm.setTeacherWishProfiles; this class only prices.
 */
public final class TeacherWishes {

    public record LoadedWishes(TeacherWishProfile profile, double scale) {
        long unitCost(final WishDegree degree) {
            return Math.max(1, Math.round(fullCostOf(degree) * scale));
        }
    }

    public record LinkedPair(String first, String second, LinkMode mode, SchoolDays day, long unit) {
    }

    /** Everything the wish rules need, swapped as one so a run never sees half an update. */
    public record WishState(Map<String, LoadedWishes> byTeacher, List<LinkedPair> links,
            Set<String> linkedTeachers) {
        public static final WishState EMPTY = new WishState(Map.of(), List.of(), Set.of());

        public boolean isEmpty() {
            return byTeacher.isEmpty() && links.isEmpty();
        }
    }

    static long fullCostOf(final WishDegree degree) {
        return switch (degree) {
            case LOW -> CostModel.LOW_COST;
            case MID -> CostModel.MID_COST;
            case HIGH -> CostModel.HIGH_COST;
            case SEVERE -> CostModel.SEVERE_COST;
        };
    }

    /** schedule day index by SchoolDays.ordinal(), -1 for days not scheduled */
    private static final int[] DAY_INDEX = new int[SchoolDays.values().length];

    static {
        java.util.Arrays.fill(DAY_INDEX, -1);
        for (int d = 0; d < Schedule.DAY_COUNT; d++) {
            DAY_INDEX[Schedule.DAYS[d].ordinal()] = d;
        }
    }

    /** by teacher index, null for teachers without wishes */
    private final LoadedWishes[] byTeacher;
    /** DOUBLE_PERIOD wishes: block lengths never change, so their cost is fixed per teacher */
    private final long[] doublePeriodCost;
    private final LinkedPair[] pairs;
    private final int[] pairFirst;
    private final int[] pairSecond;
    private final int[][] pairsOfTeacher;
    /** room a ROOM wish asks for, by block index; null when there is none */
    private final Room[] wishedRoom;

    private TeacherWishes(final LoadedWishes[] byTeacher, final long[] doublePeriodCost, final List<LinkedPair> pairs,
            final int[] pairFirst, final int[] pairSecond, final int[][] pairsOfTeacher, final Room[] wishedRoom) {
        this.byTeacher = byTeacher;
        this.doublePeriodCost = doublePeriodCost;
        this.pairs = pairs.toArray(new LinkedPair[0]);
        this.pairFirst = pairFirst;
        this.pairSecond = pairSecond;
        this.pairsOfTeacher = pairsOfTeacher;
        this.wishedRoom = wishedRoom;
    }

    /**
     * Compiles the wishes for a schedule. Wishes of teachers the schedule does
     * not have are left out; a ROOM wish only works for rooms the schedule
     * knows (home rooms and fixed rooms), anything else is reported.
     */
    static TeacherWishes of(final WishState state, final List<Teacher> teachers, final List<Room> rooms,
            final List<Block> blocks, final List<String> problems) {
        final Map<String, Integer> teacherIndex = new HashMap<>();
        for (int t = 0; t < teachers.size(); t++) {
            teacherIndex.put(teachers.get(t).getNameSymbol(), t);
        }
        final Map<Long, Room> roomById = new HashMap<>();
        for (final Room room : rooms) {
            roomById.put(room.getId(), room);
        }

        final LoadedWishes[] byTeacher = new LoadedWishes[teachers.size()];
        final long[] doublePeriodCost = new long[teachers.size()];
        final Room[] wishedRoom = new Room[blocks.size()];
        for (final Map.Entry<String, LoadedWishes> entry : state.byTeacher().entrySet()) {
            final Integer t = teacherIndex.get(entry.getKey());
            if (t == null) {
                continue;
            }
            byTeacher[t] = entry.getValue();
            for (final TeacherWish wish : entry.getValue().profile().wishes()) {
                final long unit = entry.getValue().unitCost(wish.degree());
                switch (wish.type()) {
                    case DOUBLE_PERIOD -> doublePeriodCost[t] += costForDoublePeriodWish(wish, t, blocks, unit);
                    case ROOM -> {
                        final Room room = roomById.get(wish.roomId());
                        if (room == null) {
                            problems.add(entry.getKey() + " ROOM: room " + wish.roomId() + " not in this schedule");
                            continue;
                        }
                        for (final Block block : blocks) {
                            if (contains(block.teachers, t) && teachesClass(block, wish.className())) {
                                wishedRoom[block.index] = room;
                            }
                        }
                    }
                    default -> {
                    }
                }
            }
        }

        final List<LinkedPair> pairs = new ArrayList<>();
        final List<Integer> first = new ArrayList<>();
        final List<Integer> second = new ArrayList<>();
        final List<List<Integer>> ofTeacher = new ArrayList<>();
        for (int t = 0; t < teachers.size(); t++) {
            ofTeacher.add(new ArrayList<>());
        }
        for (final LinkedPair pair : state.links()) {
            final Integer a = teacherIndex.get(pair.first());
            final Integer b = teacherIndex.get(pair.second());
            // a teacher missing from this schedule has nothing to line up with
            if (a == null || b == null) {
                continue;
            }
            ofTeacher.get(a).add(pairs.size());
            ofTeacher.get(b).add(pairs.size());
            first.add(a);
            second.add(b);
            pairs.add(pair);
        }
        final int[][] pairsOfTeacher = new int[teachers.size()][];
        for (int t = 0; t < teachers.size(); t++) {
            pairsOfTeacher[t] = ofTeacher.get(t).stream().mapToInt(Integer::intValue).toArray();
        }
        return new TeacherWishes(byTeacher, doublePeriodCost, pairs,
                first.stream().mapToInt(Integer::intValue).toArray(),
                second.stream().mapToInt(Integer::intValue).toArray(), pairsOfTeacher, wishedRoom);
    }

    int pairCount() {
        return pairs.length;
    }

    int[] pairsOf(final int t) {
        return pairsOfTeacher[t];
    }

    int firstOf(final int pair) {
        return pairFirst[pair];
    }

    int secondOf(final int pair) {
        return pairSecond[pair];
    }

    boolean hasWishes(final int t) {
        return byTeacher[t] != null;
    }

    Room wishedRoom(final Block block) {
        return wishedRoom[block.index];
    }

    private static boolean contains(final int[] array, final int value) {
        for (final int v : array) {
            if (v == value) {
                return true;
            }
        }
        return false;
    }

    private static boolean teachesClass(final Block block, final String className) {
        for (final ClassSubject member : block.members) {
            final SchoolClass schoolClass = member.getSchoolClass();
            if (schoolClass != null && className.equalsIgnoreCase(schoolClass.getClassName())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Cost of one teacher's wishes. hoursOfDay has one bit per hour taught,
     * by schedule day index. Teachers without wishes return straight away, so
     * the rule costs nothing for most of them.
     */
    long determineTeacherWishCost(final int t, final long[] hoursOfDay, final CostBreakdown breakdown) {
        final LoadedWishes loaded = byTeacher[t];
        if (loaded == null) {
            return 0;
        }
        long cost = Schedule.charge(breakdown, CostCategory.TEACHER_WISH_DOUBLE_PERIOD, doublePeriodCost[t]);
        for (final TeacherWish wish : loaded.profile().wishes()) {
            final long unit = loaded.unitCost(wish.degree());
            cost += switch (wish.type()) {
                case FREE_DAY -> Schedule.charge(breakdown, CostCategory.TEACHER_WISH_FREE_DAY,
                        costForFreeSlotWish(wish, hoursOfDay, 1, unit));
                case FREE_AFTERNOON -> Schedule.charge(breakdown, CostCategory.TEACHER_WISH_FREE_AFTERNOON,
                        costForFreeSlotWish(wish, hoursOfDay, wish.hour(), unit));
                case LATEST_END, EARLIEST_START -> Schedule.charge(breakdown, CostCategory.TEACHER_WISH_TIME_WINDOW,
                        costForTimeWindowWish(wish, hoursOfDay, unit));
                case MAX_CONSECUTIVE, MAX_HOURS_PER_DAY, NO_GAPS, FEW_DAYS -> Schedule.charge(breakdown,
                        CostCategory.TEACHER_WISH_DAY_SHAPE, costForDayShapeWish(wish, hoursOfDay, unit));
                // fixed per schedule (doublePeriodCost), honoured by the room allocation, priced per pair
                case DOUBLE_PERIOD, ROOM, LINKED_TEACHER -> 0L;
            };
        }
        return cost;
    }

    /**
     * Cost of a free day or free afternoon wish. A slot is free when nothing
     * is taught from fromHour on; fromHour 1 makes it the whole day.
     *
     * Emptying a day is a cliff - one lesson left and the wish is as broken
     * as with eight - so besides the flat charge per missing slot the hours
     * still on the emptiest candidate are priced too. That gives the annealer
     * a slope to walk down instead of a step it only takes by luck.
     */
    private static long costForFreeSlotWish(final TeacherWish wish, final long[] hoursOfDay, final int fromHour,
            final long unit) {
        final boolean ranked = wish.candidates() != null && !wish.candidates().isEmpty();
        final List<SchoolDays> candidates = ranked ? wish.candidates() : List.of(Schedule.DAYS);
        final int wanted = wish.count() == null ? 1 : wish.count();

        int free = 0;
        long rankPenalty = 0;
        int fewestHours = Integer.MAX_VALUE;
        for (int rank = 0; rank < candidates.size(); rank++) {
            final int d = DAY_INDEX[candidates.get(rank).ordinal()];
            final int hours = d < 0 ? 0 : hoursFrom(hoursOfDay[d], fromHour);
            if (hours == 0) {
                if (free < wanted) {
                    rankPenalty += rank - free;
                }
                free++;
            } else {
                fewestHours = Math.min(fewestHours, hours);
            }
        }

        if (free >= wanted) {
            // met - only a small charge for not getting the first choice
            return ranked ? rankPenalty * CostModel.LOW_COST : 0;
        }
        final long slope = fewestHours == Integer.MAX_VALUE ? 0 : fewestHours;
        return (long) (wanted - free) * unit + slope * CostModel.LOW_COST;
    }

    private static long costForTimeWindowWish(final TeacherWish wish, final long[] hoursOfDay, final long unit) {
        long cost = 0;
        for (int d = 0; d < hoursOfDay.length; d++) {
            final long bits = hoursOfDay[d];
            if (bits == 0 || (wish.day() != null && wish.day() != Schedule.DAYS[d])) {
                continue;
            }
            if (wish.type() == TeacherWishProfile.WishType.LATEST_END) {
                final int over = lastHour(bits) - wish.hour();
                if (over > 0) {
                    cost += (long) over * over * unit;
                }
            } else {
                final int under = wish.hour() - Long.numberOfTrailingZeros(bits);
                if (under > 0) {
                    cost += (long) under * unit;
                }
            }
        }
        return cost;
    }

    private static long costForDayShapeWish(final TeacherWish wish, final long[] hoursOfDay, final long unit) {
        long cost = 0;
        int totalHours = 0;
        int fewestHours = Integer.MAX_VALUE;
        int days = 0;

        for (final long bits : hoursOfDay) {
            if (bits == 0) {
                continue;
            }
            final int hours = Long.bitCount(bits);
            days++;
            totalHours += hours;
            fewestHours = Math.min(fewestHours, hours);

            switch (wish.type()) {
                case MAX_CONSECUTIVE -> {
                    final int excess = longestRun(bits) - wish.count();
                    if (excess > 0) {
                        cost += (long) excess * excess * unit;
                    }
                }
                case MAX_HOURS_PER_DAY -> {
                    final int excess = hours - wish.count();
                    if (excess > 0) {
                        cost += (long) excess * excess * unit;
                    }
                }
                case NO_GAPS -> {
                    final int gaps = (lastHour(bits) + 1 - Long.numberOfTrailingZeros(bits)) - hours;
                    final int charged = gaps - SimulatedAnnealingAlgorithm.WISH_GAP_HOURS_ALLOWED;
                    if (charged > 0) {
                        cost += (long) charged * unit;
                    }
                }
                default -> {
                }
            }
        }

        if (wish.type() == TeacherWishProfile.WishType.FEW_DAYS && days > 0) {
            // without a target, as few days as the class day cap allows
            final int target = wish.count() != null
                    ? wish.count()
                    : (int) Math.ceil((double) totalHours / CostModel.MAX_HOURS_PER_DAY);
            final int excessDays = days - target;
            if (excessDays > 0) {
                cost += (long) excessDays * unit + (long) fewestHours * CostModel.LOW_COST;
            }
        }
        return cost;
    }

    /** One unit per lesson of the class that has the length the teacher did not want. */
    private static long costForDoublePeriodWish(final TeacherWish wish, final int t, final List<Block> blocks,
            final long unit) {
        long cost = 0;
        final boolean wantsDouble = wish.doublePeriodMode() == DoublePeriodMode.PREFER;
        for (final Block block : blocks) {
            if (!contains(block.teachers, t) || !teachesClass(block, wish.className())) {
                continue;
            }
            if ((block.duration == 1) == wantsDouble) {
                cost += unit;
            }
        }
        return cost;
    }

    /**
     * Cost of one link between two teachers not lining up, given the days
     * each of them works as one bit per schedule day index. Priced once per
     * pair rather than per teacher, which would count a link twice whenever
     * both teachers asked for it.
     */
    long determineLinkedTeacherCost(final int pair, final int firstDays, final int secondDays,
            final CostBreakdown breakdown) {
        final LinkedPair link = pairs[pair];
        int violations = 0;
        for (int d = 0; d < Schedule.DAY_COUNT; d++) {
            if (link.day() != null && link.day() != Schedule.DAYS[d]) {
                continue;
            }
            final boolean a = (firstDays & (1 << d)) != 0;
            final boolean b = (secondDays & (1 << d)) != 0;
            final boolean broken;
            if (link.mode() == LinkMode.OPPOSITE_DAYS) {
                broken = a && b;
            } else {
                // a named day means both have to be there, otherwise it
                // is enough that neither works without the other
                broken = link.day() != null ? !(a && b) : a != b;
            }
            if (broken) {
                violations++;
            }
        }
        return Schedule.charge(breakdown, CostCategory.TEACHER_WISH_LINKED, (long) violations * link.unit());
    }

    /** Hours taught from fromHour on. */
    static int hoursFrom(final long bits, final int fromHour) {
        if (fromHour >= Long.SIZE) {
            return 0;
        }
        return Long.bitCount(bits & (-1L << fromHour));
    }

    static int longestRun(long bits) {
        int longest = 0;
        while (bits != 0) {
            // every round shortens each run of set bits by one
            bits &= bits << 1;
            longest++;
        }
        return longest;
    }

    private static int lastHour(final long bits) {
        return Long.SIZE - 1 - Long.numberOfLeadingZeros(bits);
    }
}
