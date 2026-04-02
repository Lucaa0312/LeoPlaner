package at.htlleonding.leoplaner.repository;

import java.util.List;

import at.htlleonding.leoplaner.data.ClassSubject;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class ClassSubjectRepository {

    @Inject
    EntityManager entityManager;

    public List<ClassSubject> getAll() {
        return ClassSubject.getAllClassSubjects();
    }

    public List<ClassSubject> getByClassName(String className) {
        return ClassSubject.getAllByClassName(className);
    }

    public ClassSubject getById(Long id) {
        return ClassSubject.getById(id);
    }

    @Transactional
    public ClassSubject add(ClassSubject classSubject) {
        if (entityManager.contains(classSubject)) {
            throw new IllegalArgumentException("Already managed");
        }

        entityManager.persist(classSubject);
        return classSubject;
    }

    @Transactional
    public ClassSubject delete(Long id) {
        ClassSubject cs = getById(id);

        if (cs != null) {
            entityManager.remove(cs);
        }

        return cs;
    }
}
