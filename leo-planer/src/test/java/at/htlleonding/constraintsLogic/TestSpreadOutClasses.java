package at.htlleonding.constraintsLogic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import jakarta.inject.Inject;
import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm;
import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Timetable;
import io.quarkus.test.junit.QuarkusTest;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class TestSpreadOutClasses {
    @Inject
    DataRepository dataRepository;
    @Inject
    SimulatedAnnealingAlgorithm simulatedAnnealingAlgorithm;

    @BeforeEach
    public void injectTestCsvDataNew() {
        final String baseDir = "../script/fakerGeneration/csvOutput/";

        final String teacherCSVPath = baseDir + "teachers.csv";
        final String classSubjectCSVPath = baseDir + "classSubjects.csv";
        final String roomCSVPath = baseDir + "rooms.csv";

        final String subjectCSVPath = "src/files/csvFiles/test1/testSubject.csv";

        CSVManager.processCSV(subjectCSVPath, dataRepository);
        CSVManager.processCSV(teacherCSVPath, dataRepository);
        CSVManager.processCSV(roomCSVPath, dataRepository);
        CSVManager.processCSV(classSubjectCSVPath, dataRepository);

        this.dataRepository.clearTimetableData();
        this.dataRepository.initRandomTimetableForAllClasses();

        simulatedAnnealingAlgorithm.initAlgorithmForAllClasses();
    }

    @Test
    void testIfDayHasUnder3Hours() {
        for (Timetable timetable : dataRepository.getCurrentTimetableList().values()) {
            for (SchoolDays schoolDay : SchoolDays.values()) {
                if (timetable.getClassSubjectInstances().stream()
                        .filter(e -> e.getPeriod().getSchoolDays() == schoolDay)
                        .count() < 3) {
                    fail("Day: " + schoolDay);
                }
            }
        }
    }
}
