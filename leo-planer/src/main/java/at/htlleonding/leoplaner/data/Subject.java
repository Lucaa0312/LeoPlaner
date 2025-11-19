package at.htlleonding.leoplaner.data;

import jakarta.persistence.Entity;

@Entity
public class Subject {
    private String subjectName;
    private RoomTypes[] requiredRoomTypes; //TODO forrign keys (onetomany) or not

    public String getSubjectName() {
        return subjectName;
    }

    public RoomTypes[] getRequiredRoomTypes() {
        return requiredRoomTypes;
    }

    public void setSubjectName(String subjectName) {
      this.subjectName = subjectName;
    }

    public void setRequiredRoomTypes(RoomTypes[] requiredRoomTypes) {
      this.requiredRoomTypes = requiredRoomTypes;
    }

}
