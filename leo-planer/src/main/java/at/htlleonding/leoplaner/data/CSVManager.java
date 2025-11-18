package at.htlleonding.leoplaner.data;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class CSVManager {
  final static String teacherType = "teacher";
  final static String roomType = "room";
  final static String subjectType = "subject";
  // TODO final static String testPath =
  // "src/resources/csvFiles/test1/testTeacher.csv";

  public static boolean processCSV(String filePath, DataRepository dataRepository) {
    String[] lines = getLinesFromCSV(filePath);

    if (lines == null || lines.length == 0) {
      return false;
    }

    String type = lines[0].split(";")[0].toLowerCase();

    switch (type) {
      case teacherType:
        createTeacherFromCSV(lines, dataRepository);
        break;
      case roomType:
        createRoomFromCSV(lines, dataRepository);
        break;
      case subjectType:
        createSubjectFromCSV(lines, dataRepository);
        break;
      default:
        throw new IllegalArgumentException("Unknown Type: " + type);
    }

    return true;
  }

  public static void createTeacherFromCSV(String[] lines, DataRepository dataRepository) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].split(";"); // MAYBE check if it has the exact amount of lines the csv should have

      // FULL CSV FORMAT EXAMPLE: ;John Doe;JD;math,physics,chemistry.CHEM,HISTORY;
      // (.CHEM is roomtype)

      String teacherName = line[0].trim();
      String nameSymbol = line[1].trim();

      ArrayList<Subject> takenSubjects = new ArrayList<>(); // CSV FORMAT: ;math,physics(maybe roomtypes with ..);
      String[] subjects = line[2].split(",");
      for (String subjectName : subjects) {
        Subject subject = dataRepository.checkIfSubjectExists(subjectName.trim());

        if (subject == null) { // MAYBE fix this with an error message "Subject not found please import subject
                               // csv first" (test is already implemented)
          subject = new Subject(subjectName.trim(), null); // TODO add roomtypes in CSV
          dataRepository.addSubject(subject);
        }
        takenSubjects.add(subject);
      }

      Teacher teacher = new Teacher(teacherName, nameSymbol, takenSubjects);
      dataRepository.addTeacher(teacher);
    }
  }

  public static void createRoomFromCSV(String[] lines, DataRepository dataRepository) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].toLowerCase().split(";");

      // FULL CSV FORMAT EXAMPLE: 101;EDUARD;;;CHEM,PHY;

      short roomNumber = Short.parseShort(line[0]);
      String roomName = line[1].trim();
      String roomPrefix = line[2].trim();
      String roomSuffix = line[3].trim();

      String[] roomTypesStrings = line[4].split(","); // TODO handle empty prefix/suffix
      RoomTypes[] roomTypesArray = new RoomTypes[roomTypesStrings.length];

      int index = 0;
      for (String roomTypeString : roomTypesStrings) {
        RoomTypes roomType = null;
        try {
          roomType = RoomTypes.valueOf(roomTypeString.trim().toUpperCase());
          roomTypesArray[index] = roomType;
          index++;
        } catch (IllegalArgumentException e) {
          System.out.println("Roomtype: " + roomType + " does not exist");
        }
      }

      Room room = new Room(roomNumber, roomName, roomPrefix, roomSuffix, roomTypesArray);
      dataRepository.addRoom(room);
    }
  }

  public static void createSubjectFromCSV(String[] lines, DataRepository dataRepository) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].toLowerCase().split(";");

      // FULL CSV LINE FORMAT EXAMPLE: Chemisty;CHEM,PHY;
      String subjectName = line[0].trim();
      String[] requiredRoomTypesStrings = line[1].split(",");
      RoomTypes[] requiredRoomTypes = new RoomTypes[requiredRoomTypesStrings.length];

      int index = 0;
      for (String roomTypeString : requiredRoomTypesStrings) {
        RoomTypes roomType;
        try {
          roomType = RoomTypes.valueOf(roomTypeString.trim().toUpperCase());
          requiredRoomTypes[index] = roomType;
          index++;
        } catch (IllegalArgumentException e) {
          // invalid room type, skip
        }
      }

      Subject subject = new Subject(subjectName, requiredRoomTypes);
      dataRepository.addSubject(subject);
    }
  }

  public static String[] getLinesFromCSV(String filePath) {
    String[] result = null;
    try {
      Path path = Paths.get(filePath);
      List<String> lines = Files.readAllLines(path);
      result = new String[lines.size()];

      for (int i = 0; i < lines.size(); i++) {
        result[i] = lines.get(i);
      }

    } catch (IOException e) {
      throw new RuntimeException(e);
    }
    return result;
  }
}
