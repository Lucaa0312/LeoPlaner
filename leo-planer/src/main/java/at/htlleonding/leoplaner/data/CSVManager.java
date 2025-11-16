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

  public static boolean processCSV(String filePath, DataRepository dataRepository) {
    String[] lines = getLinesFromCSV(filePath);

    if (lines == null || lines.length == 0) {
      return false;
    }

    switch (lines[0].split(";")[0]) {
      case teacherType:
        createTeacherFromCSV(lines, dataRepository);
        break;
      case roomType:
        createRoomFromCSV(lines, dataRepository);
        break;
      case subjectType:
        createSubjectFromCSV(lines, dataRepository);
        break;
    }

    return true;
  }

  public static void createTeacherFromCSV(String[] lines, DataRepository dataRepository) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].split(";");

      // FULL CSV FORMAT EXAMPLE: ;John Doe;JD;math,physics,chemistry.CHEM,HISTORY;
      // (.CHEM is roomtype)

      String teacherName = line[0];
      String nameSymbol = line[1];

      ArrayList<Subject> takenSubjects = new ArrayList<>(); // CSV FORMAT: ;math,physics(maybe roomtypes with ..);
      String[] subjects = line[2].split(",");
      for (String subjectName : subjects) {
        Subject subject = dataRepository.checkIfSubjectExists(subjectName);

        if (subject == null) { // MAYBE fix this with an error message "Subject not found please import subject
                               // csv first"
          subject = new Subject(subjectName, null); // TODO add roomtypes in CSV
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
      String[] line = lines[i].split(";");

      // FULL CSV FORMAT EXAMPLE: 101;EDUARD;;;CHEM,PHY;

      short roomNumber = Short.parseShort(line[0]);
      String roomName = line[1];
      String roomPrefix = line[2];
      String roomSuffix = line[3];

      String[] roomTypesStrings = line[4].split(",");
      RoomTypes[] roomTypesArray = new RoomTypes[roomTypesStrings.length];

      int index = 0;
      for (String roomTypeString : roomTypesStrings) {
        RoomTypes roomType;
        try {
          roomType = RoomTypes.valueOf(roomTypeString);
          roomTypesArray[index] = roomType;
          index++;
        } catch (IllegalArgumentException e) {
          // invalid room type, skip
        }
      }

      Room room = new Room(roomNumber, roomName, roomPrefix, roomSuffix, roomTypesArray);
      dataRepository.addRoom(room);
    }
  }

  public static void createSubjectFromCSV(String[] lines, DataRepository dataRepository) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].split(";");

      // FULL CSV LINE FORMAT EXAMPLE: Chemisty;CHEM,PHY;
      String subjectName = line[0];
      String[] requiredRoomTypesStrings = line[1].split(",");
      RoomTypes[] requiredRoomTypes = new RoomTypes[requiredRoomTypesStrings.length];

      int index = 0;
      for (String roomTypeString : requiredRoomTypesStrings) {
        RoomTypes roomType;
        try {
          roomType = RoomTypes.valueOf(roomTypeString);
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
