package at.htlleonding.leoplaner.repository;

import java.util.List;

import at.htlleonding.leoplaner.data.Subject;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class SubjectRepository {

    @Inject
    EntityManager entityManager;

    public List<Subject> getAll() {
        return Subject.getAllSubjects();
    }

    public Subject getById(Long id) {
        return Subject.getById(id);
    }

    public Subject getByName(String name) {
        return Subject.getFirstByName(name);
    }

    public Long getCount() {
        return Subject.getCountOfAllSubjects();
    }

    @Transactional
    public Subject add(Subject subject) {
        if (entityManager.contains(subject)) {
            throw new IllegalArgumentException();
        }
        entityManager.merge(subject);
        return subject;
    }

    @Transactional
    public Subject update(Long id, Subject updated) {
        Subject subject = getById(id);

        subject.setSubjectName(updated.getSubjectName());
        subject.setSubjectSymbol(updated.getSubjectSymbol());
        subject.setSubjectColor(updated.getSubjectColor());
        subject.setRequiredRoomTypes(updated.getRequiredRoomTypes());

        return subject;
    }

    @Transactional
    public Subject delete(Long id) {
        Subject subject = getById(id);

        if (subject != null) {
            entityManager.remove(subject);
        }

        return subject;
    }
}
