package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.Subject;
import at.htlleonding.leoplaner.data.Teacher;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@Transactional
public class TestTeacher {
    @Inject
    EntityManager entityManager;

    @Test
    public void testTeacherTeachesSubject() {
        Teacher teacher = new Teacher();
        Subject subject = new Subject();
        teacher.getTeachingSubject().add(subject);
        assertTrue(teacher.checkIfTeacherTeachesSubject(subject));
    }

    @Test
    public void findByName() {
        Teacher teacher = new Teacher();
        teacher.setTeacherName("Williams");

        entityManager.persist(teacher);

        List<Teacher> teachers = entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_NAME, Teacher.class)
                .setParameter("filter", "Williams")
                .getResultList();

        assertEquals("Williams", teachers.getFirst().getTeacherName());
    }

    @Test
    public void findAll() {
        Teacher teacher = new Teacher();
        Teacher teacher2 = new Teacher();

        entityManager.persist(teacher);
        entityManager.persist(teacher2);

        List<Teacher> teachers = entityManager.createNamedQuery(Teacher.QUERY_FIND_ALL, Teacher.class)
                .getResultList();

        assertEquals(2, teachers.size());
    }

    @Test
    public void findById() {
        Teacher teacher = new Teacher();
        teacher.setTeacherName("Williams");

        entityManager.persist(teacher);

        Long id = teacher.getId();
        Teacher foundTeacher = entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_ID, Teacher.class)
                .setParameter("filter", id)
                .getSingleResultOrNull();

        Teacher teacherNotExist = entityManager.createNamedQuery(Teacher.QUERY_FIND_BY_ID, Teacher.class)
                .setParameter("filter", 999)
                .getSingleResultOrNull();

        assertEquals("Williams", foundTeacher.getTeacherName());
        assertNull(teacherNotExist);
    }
}
