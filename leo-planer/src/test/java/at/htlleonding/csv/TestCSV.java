package at.htlleonding.csv;

import at.htlleonding.leoplaner.data.*;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
public class TestCSV {
    @Inject
    DataRepository dataRepository;

    public static final String teacherCSVPath = "src/files/csvFiles/test1/testTeacher.csv";
    public static final String subjectCSVPath = "src/files/csvFiles/test1/testSubject.csv";
    public static final String roomCSVPath = "src/files/csvFiles/test1/testRoom.csv";
    public static final String emptyCSV = "src/files/csvFiles/test1/testEmpty.csv";
    public static final String teacherCSVPathWithWrongSubject = "src/files/csvFiles/test1/testTeacherWrongSubject.csv";
    public static final String csvWithWrongType = "src/files/csvFiles/test1/testCSVWithWrongType.csv";
    public static final String csvWithTooLongColumn = "src/files/csvFiles/test1/testCSVWithTooLongColumnLength.csv";
    public static final String csvWithTooLongColumn1 = "src/files/csvFiles/test1/testCSVWithTooLongColumnLength1.csv";
    public static final String csvWithTooLongColumn2 = "src/files/csvFiles/test1/testCSVWithTooLongColumnLength2.csv";

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
    public void t01_testEmptyFile() {
        boolean worked = CSVManager.processCSV(emptyCSV, dataRepository);

        assertFalse(worked);
    }

    @Test
    public void t02_1_testLoadCorrectSubjectsWithFirstSubject() {
        CSVManager.processCSV(subjectCSVPath, dataRepository);
        List<RoomTypes> expectedRoomTypes = new ArrayList<>();
        expectedRoomTypes.add(RoomTypes.CHEM);
        expectedRoomTypes.add(RoomTypes.PHY);

        Record expectedColor = new RgbColor(222, 209, 214);

        assertEquals("chemistry", dataRepository.getAllSubjects().getFirst().getSubjectName());
        assertEquals(expectedRoomTypes, dataRepository.getAllSubjects().getFirst().getRequiredRoomTypes());
        assertEquals(expectedColor, dataRepository.getAllSubjects().getFirst().getSubjectColor());
    }

    @Test
    public void t02_2_testLoadCorrectTeachersWithFirstTeacher() {
        CSVManager.processCSV(subjectCSVPath, dataRepository);
        CSVManager.processCSV(teacherCSVPath, dataRepository);
        List<Subject> expectedSubjects = new ArrayList<>();
        expectedSubjects.add(dataRepository.getSubjectByName("math"));
        expectedSubjects.add(dataRepository.getSubjectByName("physics"));

        assertEquals("John Doe", dataRepository.getAllTeachers().getFirst().getTeacherName());
        assertEquals("JD", dataRepository.getAllTeachers().getFirst().getNameSymbol());
        assertEquals(expectedSubjects, dataRepository.getAllTeachers().getFirst().getTeachingSubject());
    }

    @Test
    public void t02_3_testLoadCorrectRoomsWithFirstRoom() {
        CSVManager.processCSV(roomCSVPath, dataRepository);
        List<RoomTypes> expectedRoomTypes = new ArrayList<>();
        expectedRoomTypes.add(RoomTypes.CHEM);
        expectedRoomTypes.add(RoomTypes.PHY);

        assertEquals(101, dataRepository.getAllRooms().getFirst().getRoomNumber());
        assertEquals("eduard", dataRepository.getAllRooms().getFirst().getRoomName());
        assertEquals(expectedRoomTypes, dataRepository.getAllRooms().getFirst().getRoomTypes());
    }

    @Test
    public void t03_testThrowErrorOnLoadTeachersWrongSubject() throws IOException {
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(teacherCSVPathWithWrongSubject, dataRepository);
        });

        assertEquals("Subject Maht does not exist. Please check the CSV.", exception.getMessage());
    }

    @Test
    public void t04_testThrowErrorOnLoadCSVWithWrongType() throws IOException {
        Exception exception = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(csvWithWrongType, dataRepository);
        });

        assertEquals("Unknown Type: randomType", exception.getMessage());
    }

    @Test
    public void t05_testThrowErrorOnInvalidColumnLength() {
        Exception exceptionTeacher = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(csvWithTooLongColumn, dataRepository);
        });

        Exception exceptionSubject = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(csvWithTooLongColumn1, dataRepository);
        });

        Exception exceptionRoom = assertThrows(IllegalArgumentException.class, () -> {
            CSVManager.processCSV(csvWithTooLongColumn2, dataRepository);
        });

        assertEquals("Teacher CSV is only allowed to have 3 columns! Found 8 columns in row 1",
                exceptionTeacher.getMessage());
        assertEquals("Subject CSV is only allowed to have 3 columns! Found 4 columns in row 1",
                exceptionSubject.getMessage());
        assertEquals("Room CSV is only allowed to have 5 columns! Found 7 columns in row 1",
                exceptionRoom.getMessage());
    }
}
