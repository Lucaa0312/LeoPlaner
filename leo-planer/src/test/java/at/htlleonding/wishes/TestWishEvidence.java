package at.htlleonding.wishes;

import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishDegree;
import at.htlleonding.leoplaner.data.TeacherWishProfile.WishType;
import at.htlleonding.leoplaner.wishes.WishEvidence;
import at.htlleonding.leoplaner.wishes.WishEvidence.HourMeaning;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class TestWishEvidence {

    private static Integer hour(final WishType type, final String mention, final HourMeaning meaning) {
        return WishEvidence.hour(type, mention, meaning, "text with " + mention);
    }

    @Test
    public void schoolHourIsTakenAsWrittenOrShiftedByItsMeaning() {
        assertEquals(7, hour(WishType.LATEST_END, "7. Einheit", HourMeaning.LAST_HOUR_TAUGHT));
        assertEquals(8, hour(WishType.LATEST_END, "9./10. UE", HourMeaning.FIRST_HOUR_FREE));
        assertEquals(2, hour(WishType.EARLIEST_START, "2EH", HourMeaning.FIRST_HOUR_TAUGHT));
        assertEquals(2, hour(WishType.EARLIEST_START, "1. Stunde", HourMeaning.LAST_HOUR_FREE));
        assertEquals(6, hour(WishType.FREE_AFTERNOON, "5. Stunde", HourMeaning.LAST_HOUR_TAUGHT));
        // a meaning that contradicts the type is not guessed around
        assertNull(hour(WishType.LATEST_END, "3. EH", HourMeaning.FIRST_HOUR_TAUGHT));
    }

    @Test
    public void clockTimeBecomesTheHourThatFits() {
        // hour 8 ends 15:25, hour 9 starts 15:30
        assertEquals(8, hour(WishType.LATEST_END, "15:30", HourMeaning.FIRST_HOUR_FREE));
        assertEquals(8, hour(WishType.LATEST_END, "ca. 15.30", HourMeaning.LAST_HOUR_TAUGHT));
        assertEquals(9, hour(WishType.EARLIEST_START, "15 Uhr", HourMeaning.FIRST_HOUR_TAUGHT));
        assertEquals(3, hour(WishType.EARLIEST_START, "10 Uhr", null));
        assertEquals(6, hour(WishType.FREE_AFTERNOON, "13h", null));
        // "keine 8.00 Stunden": the hour at that time is the free one
        assertEquals(2, hour(WishType.EARLIEST_START, "8.00", HourMeaning.LAST_HOUR_FREE));
    }

    @Test
    public void mentionHasToBeInTheText() {
        assertNull(WishEvidence.hour(WishType.LATEST_END, "7. Einheit", HourMeaning.LAST_HOUR_TAUGHT,
                "Bitte möglichst frühe Stunden."));
        assertNull(WishEvidence.hour(WishType.EARLIEST_START, "Nachmittag", null, "erst am Nachmittag"));
        assertEquals(WishEvidence.DEFAULT_AFTERNOON,
                WishEvidence.hour(WishType.FREE_AFTERNOON, "7", null, "Freitagnachmittag frei"));
        assertEquals(WishEvidence.DEFAULT_AFTERNOON,
                WishEvidence.hour(WishType.FREE_AFTERNOON, null, null, "Freitagnachmittag frei"));
    }

    @Test
    public void degreeFollowsTheWording() {
        final String text = "Wenn möglich Freitag frei. Unbedingt keine 10. Stunde! Dienstag frei. "
                + "Ein freier Tag wäre fein, aber nicht zwingend. Ich muss evt. die Kinder betreuen.";

        assertEquals(WishDegree.LOW, WishEvidence.degree(List.of("Wenn möglich"), null, false, text));
        assertEquals(WishDegree.HIGH, WishEvidence.degree(List.of("Unbedingt"), null, false, text));
        assertEquals(WishDegree.MID, WishEvidence.degree(List.of(), "Dienstag frei.", false, text));
        assertEquals(WishDegree.LOW, WishEvidence.degree(List.of("nicht zwingend"), null, false, text));
        assertEquals(WishDegree.MID, WishEvidence.degree(List.of("muss", "evt."), null, false, text));
        // the passage counts even when the model quotes no words
        assertEquals(WishDegree.LOW, WishEvidence.degree(null, "Wenn möglich Freitag frei.", false, text));
        // words that are not in the text are not evidence
        assertEquals(WishDegree.MID, WishEvidence.degree(List.of("dringend"), null, false, text));
        // "möglich" alone says a day works, not that the wish is weak
        assertEquals(WishDegree.MID, WishEvidence.degree(List.of(), "alternativ auch Mittwoch möglich", false,
                "Alle Stunden an einem Tag, alternativ auch Mittwoch möglich."));
    }

    @Test
    public void daysAreFoundByNameAndAbbreviation() {
        final List<SchoolDays> week = List.of(SchoolDays.schedulableDays());

        assertEquals(List.of(SchoolDays.MONDAY, SchoolDays.WEDNESDAY, SchoolDays.FRIDAY),
                WishEvidence.mentioned(week, "MO 5. bis 10., Mi. frei, Freitagnachmittag", "egal"));
        // "die" and "mit" are no days
        assertEquals(List.of(), WishEvidence.mentioned(week, "die Stunden mit Doris", "die Stunden mit Doris"));
        // the passage says "dieser", the day stands a sentence earlier
        assertEquals(List.of(SchoolDays.FRIDAY),
                WishEvidence.mentioned(week, "muss dieser frei bleiben", "Am Freitag Praxis, muss dieser frei bleiben"));
    }

    @Test
    public void severeNeedsAnEssentialWishWithoutHedging() {
        final String text = "Dienstag frei wegen Kinderbetreuung. Wenn möglich auch Mittwoch.";

        // essential on the model's word alone is HIGH, the wording has to stress it too
        assertEquals(WishDegree.HIGH, WishEvidence.degree(List.of(), "Dienstag frei", true, text));
        assertEquals(WishDegree.SEVERE, WishEvidence.degree(List.of("muss"), null, true,
                "Dienstag muss frei sein wegen Kinderbetreuung."));
        assertEquals(WishDegree.LOW, WishEvidence.degree(List.of("Wenn möglich"), null, true, text));
    }

    @Test
    public void negatedHourMovesOffTheEdgeOfTheDay() {
        // the model read the hour to stay free as the hour to teach
        assertEquals(2, WishEvidence.hour(WishType.EARLIEST_START, "1. Einheit", HourMeaning.FIRST_HOUR_TAUGHT,
                "* 1. Einheit geht bei mir verkehrstechnisch nicht"));
        assertEquals(2, WishEvidence.hour(WishType.EARLIEST_START, "8:00", HourMeaning.FIRST_HOUR_TAUGHT,
                "Bitte keine 8.00 Stunden weil ich 2 Kids abliefern muss"));
        assertEquals(9, WishEvidence.hour(WishType.LATEST_END, "17.15", HourMeaning.LAST_HOUR_TAUGHT,
                "Montag wäre mir recht, wenn ich nicht bis 17.15 Unterricht habe."));
        // the negation belongs to another clause
        assertEquals(1, WishEvidence.hour(WishType.EARLIEST_START, "08:00", HourMeaning.FIRST_HOUR_TAUGHT,
                "Ich brauche keinen freien Tag, möchte aber gerne immer um 08:00 beginnen."));
        // away from the edge the model's reading stands
        assertEquals(7, WishEvidence.hour(WishType.LATEST_END, "7. Einheit", HourMeaning.LAST_HOUR_TAUGHT,
                "dass ich nach der 7. Einheit keine Stunden habe"));
    }

    @Test
    public void limitOnAfternoonsLeavesTheRestFree() {
        assertEquals(3, WishEvidence.freeAfternoons(2, "Bitte max. 2 Nachmittage"));
        assertEquals(2, WishEvidence.freeAfternoons(2, "2 Nachmittage frei"));
        assertNull(WishEvidence.freeAfternoons(5, "höchstens 5 Nachmittage"));
    }
}
