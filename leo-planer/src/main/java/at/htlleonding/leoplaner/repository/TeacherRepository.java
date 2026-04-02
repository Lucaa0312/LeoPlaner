package at.htlleonding.leoplaner.repository;

import java.util.List;

import at.htlleonding.leoplaner.data.Teacher;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class TeacherRepository {

    @Inject
    EntityManager entityManager;

    public List<Teacher> getAllTeachers() {
        return Teacher.getAllTeachers();
    }

    public Teacher getById(Long id) {
        return Teacher.getById(id);
    }

    public Long getCount() {
        return Teacher.getCountOfAllTeachers();
    }

    public Teacher getByName(String name) {
        return Teacher.getFirstByName(name);
    }

    @Transactional
    public Teacher add(Teacher teacher) {
        if (entityManager.contains(teacher)) {
            throw new IllegalArgumentException("Teacher already managed");
        }
        entityManager.persist(teacher);
        return teacher;
    }

    @Transactional
    public Teacher update(Long id, Teacher updated) {
        Teacher teacher = getById(id);

        teacher.setNameSymbol(updated.getNameSymbol());
        teacher.setTeacherName(updated.getTeacherName());
        teacher.setTakenUpPeriods(updated.getTakenUpPeriods());
        teacher.setTeacher_non_preferred_hours(updated.getTeacher_non_preferred_hours());
        teacher.setTeacher_non_working_hours(updated.getTeacher_non_working_hours());
        teacher.setTeachingSubject(updated.getTeachingSubject());

        return teacher;
    }

    @Transactional
    public Teacher delete(Long id) {
        Teacher teacher = getById(id);

        if (teacher != null) {
            entityManager.remove(teacher);
        }

        return teacher;
    }
}
