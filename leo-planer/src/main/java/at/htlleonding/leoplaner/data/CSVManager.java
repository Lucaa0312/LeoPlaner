package at.htlleonding.leoplaner.data;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import java.util.List;

public class CSVManager {
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
        break;
      case roomType:
        break;
      case subjectType:
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
