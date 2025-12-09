package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.Subject;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@Transactional
public class TestSubject {
    @Inject
    EntityManager entityManager;

    @Test
    public void findAll() {
        Subject subject = new Subject();
        Subject subject2 = new Subject();

        entityManager.persist(subject);
        entityManager.persist(subject2);

        List<Subject> subjects = entityManager.createNamedQuery(Subject.QUERY_FIND_ALL, Subject.class)
                .getResultList();

        assertEquals(2, subjects.size());
    }

    @Test
    public void findByName() {
        Subject subject = new Subject();
        subject.setSubjectName("Math");

        entityManager.persist(subject);

        List<Subject> subjects = entityManager.createNamedQuery(Subject.QUERY_FIND_BY_NAME, Subject.class)
                .setParameter("filter", "Math")
                .getResultList();

        assertEquals(1, subjects.size());
        assertEquals("Math", subjects.getFirst().getSubjectName());
    }
}
