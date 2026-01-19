package at.htlleonding.leoplaner.dto;

import at.htlleonding.leoplaner.data.SchoolDays;

public record PeriodDTO(SchoolDays schoolDays, int schoolHour, boolean lunchBreak) {
}
