package at.htlleonding.leoplaner.algorithm;

import java.util.EnumMap;
import java.util.Map;

/**
 * Accumulates a schedule's cost per {@link CostCategory}.
 *
 * Building one costs a map per evaluation, so the hot loop passes null and
 * only pays for it when the breakdown is actually going to be read - see
 * the charge() helper in SimulatedAnnealingAlgorithm.
 */
public final class CostBreakdown {

    private final Map<CostCategory, Long> costs = new EnumMap<>(
        CostCategory.class
    );

    public void add(final CostCategory category, final long amount) {
        if (amount == 0) {
            return;
        }
        costs.merge(category, amount, Long::sum);
    }

    public long get(final CostCategory category) {
        return costs.getOrDefault(category, 0L);
    }

    public long total() {
        long total = 0;
        for (final long cost : costs.values()) {
            total += cost;
        }
        return total;
    }

    public Map<CostCategory, Long> asMap() {
        return new EnumMap<>(costs);
    }

    /** One line per non-zero category, most expensive first. */
    public String format() {
        final StringBuilder sb = new StringBuilder();
        sb.append("total=").append(total());

        costs
            .entrySet()
            .stream()
            .sorted(Map.Entry.<CostCategory, Long>comparingByValue().reversed())
            .forEach(e ->
                sb
                    .append(' ')
                    .append(e.getKey())
                    .append('=')
                    .append(e.getValue())
            );

        return sb.toString();
    }
}
