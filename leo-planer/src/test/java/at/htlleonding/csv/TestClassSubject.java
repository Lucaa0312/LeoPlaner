package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.SchoolClass;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@Transactional
public class TestClassSubject {
    @Inject
    EntityManager entityManager;

    @Test
    public void findAll() {
        ClassSubject classSubject = new ClassSubject();
        ClassSubject classSubject2 = new ClassSubject();

        entityManager.persist(classSubject);
        entityManager.persist(classSubject2);

        List<ClassSubject> classSubjects = entityManager
                .createNamedQuery(ClassSubject.QUERY_FIND_ALL, ClassSubject.class)
                .getResultList();

        assertEquals(2, classSubjects.size());
    }

    @Test
    public void findAllByClassname() {
        ClassSubject classSubject = new ClassSubject();
        ClassSubject classSubject2 = new ClassSubject();
        ClassSubject classSubject3 = new ClassSubject();

        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setClassName("4CHITM");
        SchoolClass schoolClass2 = new SchoolClass();
        schoolClass2.setClassName("3AHITM");

        entityManager.persist(schoolClass);
        entityManager.persist(schoolClass2);

        classSubject.setSchoolClass(schoolClass);
        classSubject2.setSchoolClass(schoolClass);
        classSubject3.setSchoolClass(schoolClass2);

        entityManager.persist(classSubject);
        entityManager.persist(classSubject2);
        entityManager.persist(classSubject3);

        List<ClassSubject> classSubjects = entityManager
                .createNamedQuery(ClassSubject.QUERY_FIND_ALL_BY_CLASSNAME, ClassSubject.class)
                .setParameter("filter", "4CHITM")
                .getResultList();

        assertEquals(2, classSubjects.size());
        assertEquals("4CHITM", classSubjects.getFirst().getSchoolClass().getClassName());
    }
}
