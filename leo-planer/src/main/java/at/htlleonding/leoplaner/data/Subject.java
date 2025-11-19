package at.htlleonding.leoplaner.data;

import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import jakarta.persistence.Entity;

// TODO add NamedQueries
@NamedQueries({
  @NamedQuery(name = Subject.QUERY_FIND_ALL, query = "select s from subject s")
})
@Entity
public class Subject {
    private String subjectName;
    private RoomTypes[] requiredRoomTypes; //TODO forrign keys (onetomany) or not

    public static final String QUERY_FIND_ALL = "Subject.findAll";

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
