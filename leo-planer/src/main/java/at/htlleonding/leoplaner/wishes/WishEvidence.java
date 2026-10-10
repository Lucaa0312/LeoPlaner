package at.htlleonding.leoplaner.wishes;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishDegree;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;

/**
 * Works out what a small model gets wrong when it has to do it itself: the
 * school hour and the degree of a wish. The model only quotes the hour or
 * clock time and the hedging or emphasising words as written; counting
 * ("nach der 7. Einheit" is hour 7, not 6) and weighing happen here.
 *
 * A quote that is not in the text is not used, so a made-up hour ends in
 * unmappable instead of in the timetable. The same goes for days: an answer
 * held to English day names turns "Mittwoch" into MONDAY often enough.
 */
public final class WishEvidence {

    /** What the quoted hour is for the teacher. */
    public enum HourMeaning {
        FIRST_HOUR_TAUGHT, LAST_HOUR_TAUGHT, FIRST_HOUR_FREE, LAST_HOUR_FREE
    }

    /** "Nachmittag" without a time, as system-prompt.txt says. */
    public static final int DEFAULT_AFTERNOON = 7;

    // start of school hours 1-10 in minutes of the day, as in system-prompt.txt; the evening
    // hours 11-16 can be asked for by number, their times are not known here
    private static final int[] STARTS = { 480, 535, 600, 655, 710, 765, 820, 875, 930, 985 };
    private static final int LENGTH = 50;

    private static final Pattern CLOCK = Pattern.compile("(\\d{1,2})(?:[:.](\\d{2})(?!\\d)|\\s*(?:uhr|h\\b))");
    private static final Pattern NUMBER = Pattern.compile("\\d+");

    private static final List<String> NEGATED_EMPHASIS = List.of(
            "nicht zwingend", "nicht unbedingt", "nicht so wichtig", "nicht dringend");
    private static final List<String> HEDGES = List.of(
            "wenn möglich", "falls möglich", "möglichst", "nach möglichkeit", "wäre", "würde", "könnte",
            "müsste", "eventuell", "evt", "vielleicht", "gern", "lieber", "ideal", "wenn geht", "wenn es geht");

    // full name and abbreviation as teachers write them
    private static final Map<SchoolDays, Pattern> DAY_NAMES = Map.of(
            SchoolDays.MONDAY, dayPattern("montag", "mo"),
            SchoolDays.TUESDAY, dayPattern("dienstag", "di"),
            SchoolDays.WEDNESDAY, dayPattern("mittwoch", "mi"),
            SchoolDays.THURSDAY, dayPattern("donnerstag", "do"),
            SchoolDays.FRIDAY, dayPattern("freitag", "fr"),
            SchoolDays.SATURDAY, dayPattern("samstag", "sa"));
    private static final List<String> NEGATIONS = List.of("kein", "nicht", "ohne", "frei");
    private static final List<String> FLEXIBLE = List.of("flexibel", "ander", "egal", "irgendein", "beliebig");
    private static final List<String> LIMITS = List.of("max", "höchstens", "nicht mehr als");
    // a full stop after a digit is an ordinal or a clock time, not the end of a clause
    private static final Pattern CLAUSE_END = Pattern.compile("(?<!\\d)[.!?]|[,;\\n]");

    private static final List<String> EMPHASIS = List.of(
            "kann nur", "kann ich nur", "kann erst", "kann ich erst", "unbedingt", "dringend", "prio", "wichtig", "jedenfalls", "auf jeden fall", "auf keinen fall", "keinesfalls",
            "zwingend", "muss", "brauche", "notwendig", "nötig", "!!");

    private WishEvidence() {
    }

    /**
     * The hour a LATEST_END, EARLIEST_START or FREE_AFTERNOON wish needs.
     * Null when the mention does not give one; an afternoon without a usable
     * time starts with DEFAULT_AFTERNOON.
     *
     * A start with the first hour or an end with the last one asks for
     * nothing. Where the text negates the hour ("1. Einheit geht nicht",
     * "nicht bis 17.15") the model took the hour that is to stay free for the
     * one to teach, and the hour moves by one.
     */
    public static Integer hour(final WishType type, final String mention, final HourMeaning meaning,
            final String text) {
        final Integer hour = read(type, mention, meaning, text);
        if (hour == null || mention == null || !negated(mention, text)) {
            return hour;
        }
        if (type == WishType.EARLIEST_START && hour <= 1) {
            return 2;
        }
        if (type == WishType.LATEST_END && hour == STARTS.length) {
            return STARTS.length - 1;
        }
        return hour;
    }

    private static Integer read(final WishType type, final String mention, final HourMeaning meaning,
            final String text) {
        final Integer fallback = type == WishType.FREE_AFTERNOON ? DEFAULT_AFTERNOON : null;
        if (mention == null || !numbersOccurIn(mention, text)) {
            return fallback;
        }

        final String written = mention.toLowerCase(Locale.ROOT);
        final Matcher clock = CLOCK.matcher(written);
        if (clock.find()) {
            final int minutes = Integer.parseInt(clock.group(1)) * 60
                    + (clock.group(2) == null ? 0 : Integer.parseInt(clock.group(2)));
            if (minutes > STARTS[STARTS.length - 1] + LENGTH) {
                // evening school: its hours are only known by number, not by the clock
                return null;
            }
            // a clock time is the moment the teacher leaves or arrives, whatever the model calls it;
            // only "keine 8:00 Stunde" names the hour itself
            return switch (type) {
                case LATEST_END -> lastHourEndingBy(minutes);
                case FREE_AFTERNOON -> lastHourEndingBy(minutes) + 1;
                case EARLIEST_START -> meaning == HourMeaning.LAST_HOUR_FREE ? lastHourEndingBy(minutes) + 2
                        : firstHourStartingFrom(minutes);
                default -> null;
            };
        }

        final Matcher number = NUMBER.matcher(written);
        if (!number.find()) {
            return fallback;
        }
        final int hour = Integer.parseInt(number.group());

        return switch (type) {
            case LATEST_END -> meaning == null || meaning == HourMeaning.LAST_HOUR_TAUGHT ? Integer.valueOf(hour)
                    : meaning == HourMeaning.FIRST_HOUR_FREE ? Integer.valueOf(hour - 1) : null;
            case EARLIEST_START -> meaning == null || meaning == HourMeaning.FIRST_HOUR_TAUGHT ? Integer.valueOf(hour)
                    : meaning == HourMeaning.LAST_HOUR_FREE ? Integer.valueOf(hour + 1) : null;
            case FREE_AFTERNOON -> meaning == null || meaning == HourMeaning.FIRST_HOUR_FREE ? Integer.valueOf(hour)
                    : meaning == HourMeaning.LAST_HOUR_TAUGHT ? Integer.valueOf(hour + 1) : null;
            default -> null;
        };
    }

    /**
     * LOW for hedged, HIGH for emphasised, MID for plain or mixed wording.
     * A wish the model calls essential is HIGH unless the wording hedges it,
     * and SEVERE only when the wording stresses it as well: the model alone
     * does not get to hand out the strongest degree.
     */
    public static WishDegree degree(final List<String> strengthWords, final String snippet, final boolean essential,
            final String text) {
        final String all = text.toLowerCase(Locale.ROOT);
        // a word only counts when the text has it, the quote around it may be tidied up
        final List<String> hedges = HEDGES.stream().filter(all::contains).toList();
        final List<String> emphasis = EMPHASIS.stream().filter(all::contains).toList();
        final List<String> wording = new ArrayList<>();
        if (strengthWords != null) {
            wording.addAll(strengthWords);
        }
        wording.add(snippet);

        boolean hedged = false;
        boolean stressed = false;
        for (final String quoted : wording) {
            if (quoted == null) {
                continue;
            }
            String words = quoted.toLowerCase(Locale.ROOT);
            for (final String negated : NEGATED_EMPHASIS) {
                if (words.contains(negated) && all.contains(negated)) {
                    hedged = true;
                    words = words.replace(negated, " ");
                }
            }
            hedged |= hedges.stream().anyMatch(words::contains);
            stressed |= emphasis.stream().anyMatch(words::contains);
        }

        if (essential && !hedged) {
            return stressed ? WishDegree.SEVERE : WishDegree.HIGH;
        }
        if (hedged == stressed) {
            return WishDegree.MID;
        }
        return stressed ? WishDegree.HIGH : WishDegree.LOW;
    }

    /**
     * "max. 2 Nachmittage" limits the afternoons taught, so the free ones are
     * the rest of the week. Null when that leaves none; the count as it is
     * when the passage sets no limit.
     */
    public static Integer freeAfternoons(final Integer count, final String snippet) {
        if (count == null || snippet == null) {
            return count;
        }
        final String lower = snippet.toLowerCase(Locale.ROOT);
        if (LIMITS.stream().noneMatch(lower::contains)) {
            return count;
        }
        final int free = SchoolDays.schedulableDays().length - count;
        return free < 1 ? null : Integer.valueOf(free);
    }

    /** Whether the passage says another day would do as well. */
    public static boolean flexible(final String snippet) {
        if (snippet == null) {
            return false;
        }
        final String lower = snippet.toLowerCase(Locale.ROOT);
        return FLEXIBLE.stream().anyMatch(lower::contains);
    }

    /** Whether a clause of the text that holds the mention negates it. */
    private static boolean negated(final String mention, final String text) {
        final String written = mention.toLowerCase(Locale.ROOT).trim();
        final List<String> numbers = NUMBER.matcher(written).results().map(r -> r.group()).toList();

        for (final String clause : CLAUSE_END.split(text.toLowerCase(Locale.ROOT))) {
            final List<String> inClause = NUMBER.matcher(clause).results().map(r -> r.group()).toList();
            if ((clause.contains(written) || (!numbers.isEmpty() && inClause.containsAll(numbers)))
                    && NEGATIONS.stream().anyMatch(clause::contains)) {
                return true;
            }
        }
        return false;
    }

    /**
     * The days of the list that the passage names, or the text when the
     * passage names none of them ("dieser" for a day said a sentence earlier).
     * Without a text only the passage counts.
     */
    public static List<SchoolDays> mentioned(final List<SchoolDays> days, final String snippet, final String text) {
        final List<SchoolDays> inSnippet = snippet == null ? List.of() : named(days, snippet);
        return inSnippet.isEmpty() && text != null ? named(days, text) : inSnippet;
    }

    private static List<SchoolDays> named(final List<SchoolDays> days, final String where) {
        final String lower = where.toLowerCase(Locale.ROOT);
        return days.stream()
                .filter(d -> DAY_NAMES.containsKey(d) && DAY_NAMES.get(d).matcher(lower).find())
                .toList();
    }

    private static Pattern dayPattern(final String name, final String abbreviation) {
        return Pattern.compile(name + "|(?<!\\p{L})" + abbreviation + "(?!\\p{L})");
    }

    /** 0 when the time is before the end of the first hour. */
    private static int lastHourEndingBy(final int minutes) {
        int hour = 0;
        while (hour < STARTS.length && STARTS[hour] + LENGTH <= minutes) {
            hour++;
        }
        return hour;
    }

    /** One past the last hour when the time is after the start of the last one. */
    private static int firstHourStartingFrom(final int minutes) {
        int hour = 0;
        while (hour < STARTS.length && STARTS[hour] < minutes) {
            hour++;
        }
        return hour + 1;
    }

    private static boolean numbersOccurIn(final String mention, final String text) {
        final List<String> inText = NUMBER.matcher(text).results().map(r -> r.group()).toList();
        return NUMBER.matcher(mention).results().allMatch(r -> inText.contains(r.group()));
    }
}
