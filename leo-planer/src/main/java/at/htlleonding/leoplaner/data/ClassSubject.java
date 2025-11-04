package at.htlleonding.leoplaner.data;

public class ClassSubject {
    private Teacher teacher;
    private Subject subject;
    private short weeklyHours;
    private boolean requiresDoublePeriod;
    private boolean isBetterDoublePeriod;

    public ClassSubject(Teacher teacher, Subject subject, short weeklyHours, boolean requiresDoublePeriod, boolean isBetterDoublePeriod) {
        this.teacher = teacher;
        this.subject = subject;
        this.weeklyHours = weeklyHours;
        this.requiresDoublePeriod = requiresDoublePeriod;
        this.isBetterDoublePeriod = isBetterDoublePeriod;
    }

    public Teacher getTeacher() {
        return teacher;
    }

    public Subject getSubject() {
        return subject;
    }

    public short getWeeklyHours() {
        return weeklyHours;
    }

    public boolean isRequiresDoublePeriod() {
        return requiresDoublePeriod;
    }

    public boolean isBetterDoublePeriod() {
        return isBetterDoublePeriod;
    }
}
