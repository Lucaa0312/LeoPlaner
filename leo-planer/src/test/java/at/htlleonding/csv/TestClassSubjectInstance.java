package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Teacher;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
// Do not annotate Transaction here - em will persist between tests
public class TestClassSubjectInstance {
    @Inject
    EntityManager entityManager;

    @Test
    // Use this instead
    @TestTransaction
    public void t01_testGetterSetter(){
        ClassSubjectInstance classSubjectInstance = new ClassSubjectInstance();

        ClassSubject classSubject = new ClassSubject();
        Teacher teacher = new Teacher();
        teacher.setTeacherName("Adolf");
        entityManager.persist(teacher);
        classSubject.setTeacher(teacher);
        entityManager.persist(classSubject);
        Period period = new Period();
        period.setSchoolHour(5);
        Room room = new Room();
        room.setNameShort("PE");
        entityManager.persist(room);

        classSubjectInstance.setClassSubject(classSubject);
        classSubjectInstance.setPeriod(period);
        classSubjectInstance.setRoom(room);
        classSubjectInstance.setDuration(10);
        entityManager.persist(classSubjectInstance);
        Long id = classSubjectInstance.getId();

        ClassSubjectInstance result = entityManager.find(ClassSubjectInstance.class, id);
        assertEquals("Adolf", result.getClassSubject().getTeacher().getTeacherName());
        assertEquals(5, result.getPeriod().getSchoolHour());
        assertEquals("PE", result.getRoom().getNameShort());
        assertEquals(10, result.getDuration());
    }

}
