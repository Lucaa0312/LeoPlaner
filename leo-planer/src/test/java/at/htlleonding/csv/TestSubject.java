package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Subject;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

//@QuarkusTest
@Disabled
@Transactional
public class TestSubject {
    @Inject
    EntityManager entityManager;

    @Inject
    DataRepository dataRepository;

    @Test
    public void findAll() {
        Subject subject = new Subject();
        Subject subject2 = new Subject();

        entityManager.persist(subject);
        entityManager.persist(subject2);

        List<Subject> subjects = dataRepository.getAllSubjects();
        assertEquals(2, subjects.size());
    }

    @Test
    public void findByName() {
        Subject subject = new Subject();
        subject.setSubjectName("Math");

        entityManager.persist(subject);

        List<Subject> subjects = dataRepository.getAllSubjects();

        assertEquals("Math", subjects.getFirst().getSubjectName());
    }
}
