package at.htlleonding.leoplaner.data;

import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

// TODO add NamedQueries
@NamedQueries({
  @NamedQuery(name = Subject.QUERY_FIND_ALL, query = "select s from Subject s")
})
@Entity
public class Subject {
  @Id
  @GeneratedValue
  private long id;
    private String subjectName;
  @ElementCollection
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
