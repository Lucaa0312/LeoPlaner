package at.htlleonding.leoplaner.data;

public class ClassSubjectInstance {
    private ClassSubject classSubject;
    private Period period;
    private Room room;
    private Teacher teacher;

    public ClassSubjectInstance(ClassSubject classSubject, Period period) {
        this.classSubject = classSubject;
        this.period = period;
    }
    public void assignClassRoomIfNoSpecialRoomType() {

    }

    public ClassSubject getClassSubject() {
        return classSubject;
    }

    public Period getPeriod() {
        return period;
    }
}
