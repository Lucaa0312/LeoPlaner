package at.htlleonding.leoplaner.data;

public class ClassSubjectInstance {
    private ClassSubject classSubject;
    private Period period;
    private Room room;

    public ClassSubjectInstance(final ClassSubject classSubject, final Period period, final Room room) {
        this.classSubject = classSubject;
        this.period = period;
        this.room = room;
    }

    public void assignClassRoomIfNoSpecialRoomType() {

    }

    public ClassSubject getClassSubject() {
        return classSubject;
    }

    public Period getPeriod() {
        return period;
    }

    public void setClassSubject(final ClassSubject classSubject) {
        this.classSubject = classSubject;
    }

    public void setPeriod(final Period period) {
        this.period = period;
    }

    public Room getRoom() {
        return room;
    }

    public void setRoom(final Room room) {
        this.room = room;
    }

}
