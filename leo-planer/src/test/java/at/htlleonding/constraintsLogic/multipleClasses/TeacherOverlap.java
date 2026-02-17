package at.htlleonding.constraintsLogic.multipleClasses;

import org.junit.jupiter.api.*;

import jakarta.inject.Inject;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Timetable;
import io.quarkus.test.junit.QuarkusTest;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@QuarkusTest
public class TeacherOverlap {

    @Inject
    DataRepository dataRepository;

    @Test
    void testTeachersNotOverlappingInMultipleClasses() {
        Map<Teacher, List<Period>> teacherTakenPeriods = new HashMap<>();
        var timetablesAllClasses = this.dataRepository.getCurrentTimetableList()
                .values();

        for (Timetable timetable : timetablesAllClasses) {
            for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                if (csi == null || csi.getClassSubject() == null) {
                    continue;
                }
                final Teacher teacher = csi.getClassSubject().getTeacher();
                final Period period = csi.getPeriod();

                List<Period> takenPeriods = teacherTakenPeriods.computeIfAbsent(teacher, k -> new ArrayList<>());

                for (Period periodTaken : takenPeriods) {
                    if (periodTaken.getSchoolDays() == period.getSchoolDays()
                            && periodTaken.getSchoolHour() == period.getSchoolHour()) {
                        fail(teacher.getTeacherName() + " is double fouled like two classes at the same time "
                                + period.getSchoolDays() + " " + period.getSchoolHour());
                    }
                }

                List<Period> takenPeriodListForTeacher = teacherTakenPeriods
                        .get(teacher);
                takenPeriodListForTeacher.add(period);

                teacherTakenPeriods.put(teacher, takenPeriodListForTeacher);
            }
        }
    }
}
