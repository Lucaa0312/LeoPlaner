package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.DataRepository;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;

public class TestCSV {
    @Inject
    DataRepository dataRepository;

    public static final String teacherCSVPath = "src/resources/csvFiles/test1/testTeacher.csv";
    public static final String subjectCSVPath = "src/resources/csvFiles/test1/testSubject.csv";
    public static final String roomCSVPath = "src/resources/csvFiles/test1/testRoom.csv";
    public static final String emptyCSV = "src/resources/csvFiles/test1/testEmpty.csv";
    public static final String teacherCSVPathWithWrongSubject = "src/resources/csvFiles/test1/testTeacherWrongSubject.csv";
    public static final String csvWithWrongType = "src/resources/csvFiles/test1/testCSVWithWrongType.csv";
    public static final String csvWithTooLongColumn = "src/resources/csvFiles/test1/testCSVWithTooLongColumnLength.csv";

    @BeforeAll
    public static void checkIfFilesExist() throws IOException {
        Path pathTeacher = Paths.get(teacherCSVPath);
        Path pathSubject = Paths.get(subjectCSVPath);
        Path pathRoom = Paths.get(roomCSVPath);

        if (!Files.exists(pathTeacher)) {
            Assertions.fail("ERROR: File " + teacherCSVPath + " could not be found.");
        }
        if (!Files.exists(pathSubject)) {
            Assertions.fail("ERROR: File " + subjectCSVPath + " could not be found.");
        }
        if (!Files.exists(pathRoom)) {
            Assertions.fail("ERROR: File " + roomCSVPath + " could not be found.");
        }
    }

    @Test
    public void t01_testLoadFileReturnsFalseOnEmptyCSV() throws IOException{
        boolean worked = CSVManager.processCSV(emptyCSV, dataRepository);

        assertFalse(worked);
    }

    @Test
    public void t02_testFirstTeacherOnLoadValidTeacherCSV() throws IOException {
        CSVManager.processCSV(teacherCSVPath, dataRepository);

        assertEquals("John Doe", dataRepository.getTeachers().getFirst().getTeacherName());
        assertEquals("JD", dataRepository.getTeachers().getFirst().getNameSymbol());
        //assertEquals("Math", instance.getTeachers().getFirst().getTeachingSubject().getFirst());
    }

    @Test
    public void t03_testThrowErrorOnLoadTeachersWrongSubject() throws IOException {
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(teacherCSVPathWithWrongSubject, dataRepository);
        });

        assertEquals("This subject doesn't exist.", exception.getMessage());
    }

    @Test
    public void t04_testThrowErrorOnLoadCSVWithWrongType() throws IOException {
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(csvWithWrongType, dataRepository);
        });
    }

    @Test
    public void t05_testThrowErrorOnInvalidColumnLengthOnLoadTeacherCSV() {
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(csvWithTooLongColumn, dataRepository);
        });
    }
}
