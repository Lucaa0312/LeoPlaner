package at.htlleonding.leoplaner.data;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import java.util.List;

public class CSVManager {
  // TODO decide make static or non static
  private CSVManager csvManager;
  final static String teacherType = "teacher";
  final static String roomType = "room";
  final static String subjectType = "subject";

  private DataRepository dataRepository = DataRepository.getInstance();

  public static boolean processCSV(String filePath) {
    String[] lines = getLinesFromCSV(filePath);

    if (lines == null || lines.length == 0) {
      return false;
    }

    switch (lines[1].split(";")[0]) {
      case teacherType:
        createTeacherFromCSV(lines);
        break;
      case roomType:
        createRoomFromCSV(lines);
        break;
      case subjectType:
        createSubjectFromCSV(lines);
        break;
    }

    return true;
  }

  public static void createTeacherFromCSV(String[] lines) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].split(";");

      String teacherName = line[0];
      String nameSymbol = line[1];
      // TODO taken subjects split and generate array + create
      // TODO handle DataRepository not being static
    }
  }

  public static void createRoomFromCSV(String[] lines) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].split(";");

      String roomName = line[0];
      String roomPrefix = line[1];
      String roomSuffix = line[2];
      // TODO handle roomtypes array being parsed correctly
      DataRepository.
    }
  }

  public static void createSubjectFromCSV(String[] lines) {
    for (int i = 1; i < lines.length; i++) {
      String[] line = lines[i].split(";");

      String subjectName = line[0];
      // TODO handle required roomtypes array being parsed correctly
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
