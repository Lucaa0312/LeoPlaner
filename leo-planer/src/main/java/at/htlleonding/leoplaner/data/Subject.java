package at.htlleonding.leoplaner.data;

import jakarta.persistence.*;
import org.hibernate.annotations.NamedQueries;
import org.hibernate.annotations.NamedQuery;

import java.util.List;

// TODO add NamedQueries
@NamedQueries({
        @NamedQuery(name = Subject.QUERY_FIND_ALL, query = "select s from Subject s"),
        @NamedQuery(name = Subject.QUERY_FIND_BY_NAME, query = "select s from Subject s where s.subjectName = :filter")
})
@Entity
public class Subject {
    @Id
    @GeneratedValue
    private Long id;
    private String subjectName;

    @ElementCollection(targetClass = RoomTypes.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable( // create new join table
            name = "subject_required_roomtypes",
            joinColumns = @JoinColumn(name = "subject_id")
    )
    @Column(name = "room_type")
    private List<RoomTypes> requiredRoomTypes;

    public static final String QUERY_FIND_ALL = "Subject.findAll";
    public static final String QUERY_FIND_BY_NAME = "Subject.findByName";

    public String getSubjectName() {
        return subjectName;
    }

    public List<RoomTypes> getRequiredRoomTypes() {
        return requiredRoomTypes;
    }

    public void setSubjectName(final String subjectName) {
        this.subjectName = subjectName;
    }

    public void setRequiredRoomTypes(final List<RoomTypes> requiredRoomTypes) {
        this.requiredRoomTypes = requiredRoomTypes;
    }

    public Long getId() {
        return id;
    }

    public static String getQueryFindAll() {
        return QUERY_FIND_ALL;
    }

    public static String getQueryFindByName() {
        return QUERY_FIND_BY_NAME;
    }

}
