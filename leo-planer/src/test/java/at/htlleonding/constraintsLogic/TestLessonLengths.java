package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.repository.TimetableService;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Lesson lengths are fixed for the whole run - no move splits or merges a
 * lesson - so the start schedule has to cut the weekly hours sensibly.
 */
public class TestLessonLengths {

    private static ClassSubject subject(
        final long id,
        final int weeklyHours,
        final boolean requiresDouble,
        final boolean betterDouble
    ) {
        final ClassSubject cs = new ClassSubject();
        cs.setId(id);
        cs.setWeeklyHours(weeklyHours);
        cs.setRequiresDoublePeriod(requiresDouble);
        cs.setBetterDoublePeriod(betterDouble);
        return cs;
    }

    private static List<Integer> durationsOf(
        final List<ClassSubjectInstance> instances,
        final ClassSubject cs
    ) {
        return instances
            .stream()
            .filter(csi -> csi.getClassSubject() == cs)
            .map(ClassSubjectInstance::getDuration)
            .sorted()
            .toList();
    }

    @Test
    public void doublesForDoubleSubjectsSinglesForTheRest() {
        final ClassSubject required = subject(1, 4, true, false);
        final ClassSubject preferredOdd = subject(2, 5, false, true);
        final ClassSubject plain = subject(3, 3, false, false);

        final List<ClassSubjectInstance> instances = new TimetableService()
            .createRandomInstances(List.of(required, preferredOdd, plain), null);

        assertEquals(List.of(2, 2), durationsOf(instances, required));
        assertEquals(List.of(1, 2, 2), durationsOf(instances, preferredOdd));
        assertEquals(List.of(1, 1, 1), durationsOf(instances, plain));
    }
}
