package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Subject;
import at.htlleonding.leoplaner.data.Teacher;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@Disabled
@Transactional
public class TestTeacher {
    @Inject
    EntityManager entityManager;

    @Inject
    DataRepository dataRepository;

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

        List<Teacher> teachers = dataRepository.getAllTeachers();
    }

    @Test
    public void findAll() {
        Teacher teacher = new Teacher();
        Teacher teacher2 = new Teacher();

        entityManager.persist(teacher);
        entityManager.persist(teacher2);

        List<Teacher> teachers = dataRepository.getAllTeachers();

        assertEquals(2, teachers.size());
    }

    @Test
    public void findById() {
        Teacher teacher = new Teacher();
        teacher.setTeacherName("Williams");

        entityManager.persist(teacher);

        Long id = teacher.getId();
        Teacher foundTeacher = dataRepository.getTeacherById(id);
        Teacher teacherNotExist = dataRepository.getTeacherById(999L);
        assertEquals("Williams", foundTeacher.getTeacherName());
        assertNull(teacherNotExist);
    }
}
