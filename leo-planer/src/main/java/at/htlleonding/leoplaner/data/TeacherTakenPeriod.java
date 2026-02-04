package at.htlleonding.leoplaner.data;

import jakarta.persistence.Embeddable;

@Embeddable
public record TeacherTakenPeriod(Period period, String className) { // TODO add classId maybe
}
