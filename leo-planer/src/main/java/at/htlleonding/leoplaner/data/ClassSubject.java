package at.htlleonding.leoplaner.data;

public class ClassSubject {
    private Teacher teacher;
    private Room room;
    private Subject subject;
    private short weeklyHours;
    private boolean requiresDoublePeriod;
    private boolean isBetterDoublePeriod;

    public ClassSubject(Teacher teacher, Room room, Subject subject, short weeklyHours, boolean requiresDoublePeriod, boolean isBetterDoublePeriod) {
        this.teacher = teacher;
        this.room = room;
        this.subject = subject;
        this.weeklyHours = weeklyHours;
        this.requiresDoublePeriod = requiresDoublePeriod;
        this.isBetterDoublePeriod = isBetterDoublePeriod;
    }

    public Teacher getTeacher() {
        return teacher;
    }

    public Room getRoom() {
        return room;
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
