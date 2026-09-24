package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * What the AI makes of one teacher's free-text wish, one entry per wish.
 *
 * Deliberately carries no cost: the AI only says what is wanted and how
 * strongly, the algorithm decides what that is worth. WishDegree has no
 * IMPOSSIBLE on purpose - hard constraints stay TeacherNonWorkingHours and
 * go through a human.
 *
 * teacherId and textHash are the export's, so a profile can be matched to its
 * wish text the same way TimetableExportImporter matches teacherWishes.json.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TeacherWishProfile(
        String teacherId,
        String textHash,
        List<TeacherWish> wishes,
        List<String> unmappable) {

    private static final String TEACHER_PREFIX = "TR_";

    public TeacherWishProfile {
        wishes = wishes == null ? List.of() : wishes;
        unmappable = unmappable == null ? List.of() : unmappable;
    }

    public String nameSymbol() {
        return toNameSymbol(teacherId);
    }

    public static String toNameSymbol(final String exportId) {
        return exportId != null && exportId.startsWith(TEACHER_PREFIX)
                ? exportId.substring(TEACHER_PREFIX.length())
                : exportId;
    }

    /** Which fields of TeacherWish a type reads; everything else is ignored. */
    public enum WishType {
        /** count (default 1), candidates ranked best first, empty = any day */
        FREE_DAY,
        /** hour = first hour counted as afternoon, count (default 1), candidates as above */
        FREE_AFTERNOON,
        /** hour = last hour to teach, day = null for every day */
        LATEST_END,
        /** hour = first hour to teach, day = null for every day */
        EARLIEST_START,
        /** count = longest block of hours in a row */
        MAX_CONSECUTIVE,
        /** count = most hours on one day */
        MAX_HOURS_PER_DAY,
        /** count = target number of days, null = as few as the hours allow */
        FEW_DAYS,
        /** no parameters */
        NO_GAPS,
        /** otherTeacherId (resolved from otherTeacherName), linkMode, day optional */
        LINKED_TEACHER,
        /** className, doublePeriodMode */
        DOUBLE_PERIOD,
        /** className, roomId - roomName is what the text says, roomId is resolved before loading */
        ROOM
    }

    public enum WishDegree {
        LOW, MID, HIGH, SEVERE
    }

    public enum LinkMode {
        SAME_DAYS, OPPOSITE_DAYS
    }

    public enum DoublePeriodMode {
        PREFER, AVOID
    }

    /**
     * One wish. Flat on purpose so the AI fills a single JSON schema; which
     * fields a type needs is listed at WishType and checked by problems().
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TeacherWish(
            WishType type,
            WishDegree degree,
            Integer count,
            Integer hour,
            SchoolDays day,
            List<SchoolDays> candidates,
            String otherTeacherId,
            String otherTeacherName,
            LinkMode linkMode,
            String className,
            DoublePeriodMode doublePeriodMode,
            String roomName,
            Long roomId,
            String sourceSnippet) {

        /** Empty when the wish can be priced as it stands. */
        public List<String> problems() {
            final List<String> problems = new ArrayList<>();
            if (type == null) {
                problems.add("type missing");
                return problems;
            }
            if (degree == null) {
                problems.add("degree missing");
            }
            if (count != null && count < 1) {
                problems.add("count below 1");
            }
            if (hour != null && (hour < 1 || hour > TimetableManager.LAST_SCHOOL_HOUR)) {
                problems.add("hour outside the school day");
            }

            final List<SchoolDays> schedulable = Arrays.asList(SchoolDays.schedulableDays());
            if (day != null && !schedulable.contains(day)) {
                problems.add("day not schedulable");
            }
            if (candidates != null && !schedulable.containsAll(candidates)) {
                problems.add("candidate day not schedulable");
            }

            switch (type) {
                case FREE_AFTERNOON, LATEST_END, EARLIEST_START -> {
                    if (hour == null) {
                        problems.add("hour missing");
                    }
                }
                case MAX_CONSECUTIVE, MAX_HOURS_PER_DAY -> {
                    if (count == null) {
                        problems.add("count missing");
                    }
                }
                case LINKED_TEACHER -> {
                    if (otherTeacherId == null) {
                        problems.add("otherTeacherId missing");
                    }
                    if (linkMode == null) {
                        problems.add("linkMode missing");
                    }
                }
                case DOUBLE_PERIOD -> {
                    if (className == null) {
                        problems.add("className missing");
                    }
                    if (doublePeriodMode == null) {
                        problems.add("doublePeriodMode missing");
                    }
                }
                case ROOM -> {
                    if (className == null) {
                        problems.add("className missing");
                    }
                    if (roomId == null) {
                        problems.add("roomId missing (resolve roomName first)");
                    }
                }
                default -> {
                }
            }
            return problems;
        }
    }
}
