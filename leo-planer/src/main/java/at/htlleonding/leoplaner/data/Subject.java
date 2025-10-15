package main.java.at.htlleonding.leoplaner.data;

public class Subject {
    private String subjectName;
    private RoomTypes[] requiredRoomTypes;

    public String getSubjectName() {
        return subjectName;
    }

    public RoomTypes[] getRequiredRoomTypes() {
        return requiredRoomTypes;
    }

    public Subject(String subjectName, RoomTypes[] requiredRoomTypes) {
        this.subjectName = subjectName;
        this.requiredRoomTypes = requiredRoomTypes;
    }
}
