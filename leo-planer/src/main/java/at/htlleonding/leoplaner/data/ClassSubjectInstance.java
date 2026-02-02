package at.htlleonding.leoplaner.data;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;

@Entity
public class ClassSubjectInstance {
    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne
    @JoinColumn(name = "classSubject_id")
    private ClassSubject classSubject;

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "schoolDays", column = @Column(name = "school_day")),
            @AttributeOverride(name = "schoolHour", column = @Column(name = "school_hour")),
            @AttributeOverride(name = "lunchBreak", column = @Column(name = "lunch_break")),
    })
    private Period period;

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    private int duration; // amount of hours (classes) specific instance takes

    public ClassSubjectInstance(final ClassSubject classSubject, final Period period, final Room room, // TODO maybe
                                                                                                       // delete now
                                                                                                       // that entity
            final int duration) {
        this.classSubject = classSubject;
        this.period = period;
        this.room = room;
        this.duration = duration;
    }

    public ClassSubjectInstance(Long id) {
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public int getDuration() {
        return duration;
    }

    public void setDuration(int duration) {
        this.duration = duration;
    }
}
