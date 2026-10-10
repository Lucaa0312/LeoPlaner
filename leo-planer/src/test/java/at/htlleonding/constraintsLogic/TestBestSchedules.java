package at.htlleonding.constraintsLogic;

import static org.junit.jupiter.api.Assertions.assertEquals;

import at.htlleonding.leoplaner.repository.TimetableService;
import at.htlleonding.leoplaner.repository.TimetableService.BestSchedule;
import java.util.List;
import org.junit.jupiter.api.Test;

public class TestBestSchedules {

    private static List<Long> costs(final TimetableService service) {
        return service.getBestSchedules().stream().map(BestSchedule::cost).toList();
    }

    @Test
    public void keepsTheThreeCheapestInOrder() {
        final TimetableService service = new TimetableService();
        service.setBest(new int[] { 1 }, 500);
        service.setBest(new int[] { 2 }, 300);
        service.setBest(new int[] { 3 }, 400);
        service.setBest(new int[] { 4 }, 900); // worse than all three kept
        service.setBest(new int[] { 5 }, 100);

        assertEquals(List.of(100L, 300L, 400L), costs(service));
    }

    @Test
    public void theSameScheduleIsKeptOnlyOnce() {
        final TimetableService service = new TimetableService();
        service.setBest(new int[] { 1, 2 }, 500);
        service.setBest(new int[] { 1, 2 }, 500);

        assertEquals(List.of(500L), costs(service));
    }

    @Test
    public void clearingForgetsThem() {
        final TimetableService service = new TimetableService();
        service.setBest(new int[] { 1 }, 500);
        service.clear();

        assertEquals(List.of(), costs(service));
    }
}
