package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.ClassSubject;
import at.htlleonding.leoplaner.data.SchoolClass;
import at.htlleonding.leoplaner.data.Subject;
import at.htlleonding.leoplaner.data.Teacher;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
// Do not annotate Transaction here - em will persist between tests
public class TestClassSubject {
    @Inject
    EntityManager entityManager;

    @Test
    // Use this instead
    @TestTransaction
    public void t01_testGetterSetter(){
        ClassSubject classSubject = new ClassSubject();

        Teacher teacher = new Teacher();
        teacher.setTeacherName("Adolf");
        entityManager.persist(teacher);
        Subject subject = new Subject();
        subject.setSubjectName("Fliegen");
        entityManager.persist(subject);
        SchoolClass schoolClass = new SchoolClass();
        schoolClass.setClassName("4CHITM");
        entityManager.persist(schoolClass);

        classSubject.setTeacher(teacher);
        classSubject.setSubject(subject);
        classSubject.setSchoolClass(schoolClass);
        classSubject.setWeeklyHours(2);
        classSubject.setBetterDoublePeriod(true);
        classSubject.setRequiresDoublePeriod(false);
        entityManager.persist(classSubject);
        Long id = classSubject.getId();

        ClassSubject result = entityManager.find(ClassSubject.class, id);
        assertEquals("Adolf", result.getTeacher().getTeacherName());
        assertEquals("Fliegen", result.getSubject().getSubjectName());
        assertEquals("4CHITM", result.getSchoolClass().getClassName());
        assertEquals(2, result.getWeeklyHours());
        assertEquals(true, result.isBetterDoublePeriod());
        assertEquals(false, result.isRequiresDoublePeriod());
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @TestTransaction
    public void t02_testFindAll() {
        ClassSubject classSubject = new ClassSubject();
        ClassSubject classSubject2 = new ClassSubject();

        entityManager.persist(classSubject);
        entityManager.persist(classSubject2);

        List<ClassSubject> classSubjects = entityManager
                .createNamedQuery(ClassSubject.QUERY_FIND_ALL, ClassSubject.class)
                .getResultList();

        assertEquals(2, classSubjects.size());
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @TestTransaction
    public void t03_testFindAllByClassname() {
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
        entityManager.flush();
        entityManager.clear();
    }
}
