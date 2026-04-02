package at.htlleonding.leoplaner.repository;

import java.util.List;

import at.htlleonding.leoplaner.data.SchoolClass;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class SchoolClassRepository {

    @Inject
    EntityManager entityManager;

    public List<SchoolClass> getAll() {
        return SchoolClass.getAllSchoolClasss();
    }

    public SchoolClass getById(Long id) {
        return SchoolClass.getById(id);
    }

    public SchoolClass getByName(String className) {
        return SchoolClass.getFirstByName(className);
    }

    @Transactional
    public SchoolClass add(SchoolClass schoolClass) {
        if (entityManager.contains(schoolClass)) {
            throw new IllegalArgumentException("SchoolClass already managed");
        }

        entityManager.persist(schoolClass);
        return schoolClass;
    }

    @Transactional
    public SchoolClass update(Long id, SchoolClass updated) {
        SchoolClass existing = getById(id);

        existing.setClassName(updated.getClassName());
        existing.setClassRoom(updated.getClassRoom());
        existing.setClassSubjects(updated.getClassSubjects());

        return existing;
    }

    @Transactional
    public SchoolClass delete(Long id) {
        SchoolClass schoolClass = getById(id);

        if (schoolClass != null) {
            entityManager.remove(schoolClass);
        }

        return schoolClass;
    }
}
