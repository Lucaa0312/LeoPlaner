package at.htlleonding.leoplaner.data;

import java.util.List;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.JoinColumn;

@Entity
public class Subject extends PanacheEntity {
    private String subjectName;
    private RgbColor subjectColor;

    @ElementCollection(targetClass = RoomTypes.class)
    @Enumerated(EnumType.STRING)
    @CollectionTable( // create new join table
            name = "subject_required_roomtypes", joinColumns = @JoinColumn(name = "subject_id"))
    @Column(name = "room_type")
    private List<RoomTypes> requiredRoomTypes;

    public static List<Subject> getByName(final String filter) {
        return find("LOWER(subjectName) like LOWER(?1)", "%" + filter + "%").list();
    }

    public static Subject getFirstByName(final String filter) {
        return find("LOWER(subjectName) like LOWER(?1)", "%" + filter + "%").firstResult();
    }

    public static Subject getById(final Long id) {
        return find("id", id).firstResult();
    }

    public static List<Subject> getAllSubjects() {
        return Subject.listAll();
    }

    public static Long getCountOfAllSubjects() {
        return Subject.count();
    }

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

    public RgbColor getSubjectColor() {
        return subjectColor;
    }

    public void setSubjectColor(final RgbColor subjectColor) {
        this.subjectColor = subjectColor;
    }

    public Long getId() {
        return id;
    }

}
