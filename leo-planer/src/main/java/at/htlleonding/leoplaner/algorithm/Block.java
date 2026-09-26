package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.SchoolClass;
import java.util.ArrayList;
import java.util.List;

/**
 * One lesson of the week as the solver moves it: a block of duration hours
 * that belongs to every class of its lesson at once. A lesson coupling nine
 * classes is one block, not nine copies that would have to be kept in step.
 *
 * The indexes point into the Schedule the block was built for.
 */
public final class Block {

    final int index;
    final List<ClassSubject> members;
    final int duration;
    final int[] classes;
    final int[] teachers;
    final int[] rooms;
    /** parallel group index, 0 for a lesson the whole class attends */
    final int group;
    final int firstHour;
    final int lastHour;
    final boolean betterDouble;

    /** -1 while the block is not placed */
    int day = -1;
    int hour;

    Block(final int index, final List<ClassSubject> members, final int duration, final int[] classes,
            final int[] teachers, final int[] rooms, final int group, final int firstHour, final int lastHour) {
        this.index = index;
        this.members = members;
        this.duration = duration;
        this.classes = classes;
        this.teachers = teachers;
        this.rooms = rooms;
        this.group = group;
        this.firstHour = firstHour;
        this.lastHour = lastHour;
        this.betterDouble = members.getFirst().isBetterDoublePeriod();
    }

    public int getDuration() {
        return duration;
    }

    public int getDay() {
        return day;
    }

    public int getHour() {
        return hour;
    }

    public boolean isPlaced() {
        return day >= 0;
    }

    public List<ClassSubject> getMembers() {
        return members;
    }

    /** The copy of this lesson that belongs to schoolClass, or null. */
    public ClassSubject memberOf(final SchoolClass schoolClass) {
        for (final ClassSubject member : members) {
            if (member.getSchoolClass() == schoolClass) {
                return member;
            }
        }
        return null;
    }

    /**
     * How a lesson's weekly hours are cut into blocks: blockSizes when it is
     * set, otherwise doubles for subjects that need or prefer them (plus a
     * single for an odd hour) and single hours for everything else.
     *
     * No move ever splits or merges a block, so whatever this returns is what
     * the whole run has to work with.
     */
    public static List<Integer> lengths(final ClassSubject cs) {
        final List<Integer> blocks = new ArrayList<>();
        final String sizes = cs.getBlockSizes();
        if (sizes != null && !sizes.isBlank()) {
            try {
                for (final String size : sizes.split(",")) {
                    final int length = Integer.parseInt(size.trim());
                    if (length > 0) {
                        blocks.add(length);
                    }
                }
                if (!blocks.isEmpty()) {
                    return blocks;
                }
            } catch (final NumberFormatException e) {
                blocks.clear(); // unreadable, fall back to the flags
            }
        }

        final int hours = Math.max(0, cs.getWeeklyHours());
        if (cs.isRequiresDoublePeriod() || cs.isBetterDoublePeriod()) {
            // doubles first: they are the harder ones to fit
            for (int i = 0; i < hours / 2; i++) {
                blocks.add(2);
            }
            if (hours % 2 == 1) {
                blocks.add(1);
            }
            return blocks;
        }
        for (int i = 0; i < hours; i++) {
            blocks.add(1);
        }
        return blocks;
    }
}
