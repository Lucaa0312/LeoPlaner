package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.ClassSubject;
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

        // classSubject.setClassName("4CHITM");
        // classSubject2.setClassName("4CHITM");
        // classSubject3.setClassName("3AHIF");

        entityManager.persist(classSubject);
        entityManager.persist(classSubject2);
        entityManager.persist(classSubject3);

        List<ClassSubject> classSubjects = entityManager
                .createNamedQuery(ClassSubject.QUERY_FIND_ALL_BY_CLASSNAME, ClassSubject.class)
                .setParameter("filter", "4CHITM")
                .getResultList();

        assertEquals(2, classSubjects.size());
        // assertEquals("4CHITM", classSubjects.getFirst().getClassName());
        // assertEquals("4CHITM", classSubjects.get(1).getClassName());
    }
}
