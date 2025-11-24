package at.htlleonding.leoplaner.data;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class CSVManager {
    final static String teacherType = "teacher";
    final static String roomType = "room";
    final static String subjectType = "subject";
    final static String classSubjectType = "classsubject"; // TODO make finals name UPPERCASE

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
            case classSubjectType:
                createClassSubjectFromCSV(lines, dataRepository);
                break;
            default:
                throw new IllegalArgumentException("Unknown Type: " + type);
        }

        return true;
    }

    public static void createTeacherFromCSV(String[] lines, DataRepository dataRepository) {
        for (int i = 1; i < lines.length; i++) {
            String[] line = lines[i].split(";");
            if (line.length != 3) {
                throw new IllegalArgumentException("Teacher CSV is ONLY allowed to have 4 columns! Found " + line.length + " columns in row " + i);
            }
            // FULL CSV FORMAT EXAMPLE: ;John Doe;JD;math,physics,chemistry.CHEM,HISTORY;
            // (.CHEM is roomtype)

            String teacherName = line[0].trim();
            String nameSymbol = line[1].trim();

            ArrayList<Subject> takenSubjects = new ArrayList<>(); // CSV FORMAT: ;math,physics(maybe roomtypes with ..);
            String[] subjects = line[2].split(",");
            for (String subjectName : subjects) {
                Subject subject = dataRepository.getSubjectByNameAndCheckIfExists(subjectName.trim().toLowerCase());

                if (subject == null) {
                    throw new IllegalArgumentException("Subject " + subjectName + " does not exist. Please check the CSV.");
                }
                takenSubjects.add(subject);
            }

            Teacher teacher = new Teacher();
            teacher.setTeacherName(teacherName);
            teacher.setNameSymbol(nameSymbol);
            teacher.setTeachingSubject(takenSubjects);
            dataRepository.addTeacher(teacher);
        }
    }

    public static void createRoomFromCSV(String[] lines, DataRepository dataRepository) {
        for (int i = 1; i < lines.length; i++) {
            String[] line = lines[i].toLowerCase().split(";");
            if (line.length > 6) {
                throw new IllegalArgumentException("Room CSV is ONLY allowed to have 6 columns! Found " + line.length + " columns in row " + i);
            }
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

            Room room = new Room();
            room.setRoomNumber(roomNumber);
            room.setRoomName(roomName);
            room.setRoomPrefix(roomPrefix);
            room.setRoomSuffix(roomSuffix);
            room.setRoomTypes(Arrays.stream(roomTypesArray).toList());
            dataRepository.addRoom(room);
        }
    }

    public static void createSubjectFromCSV(String[] lines, DataRepository dataRepository) {
        for (int i = 1; i < lines.length; i++) {
            String[] line = lines[i].toLowerCase().split(";");
            if (line.length < 1) {
                throw new IllegalArgumentException("Subject CSV is ONLY allowed to have 1 columns! Found " + line.length + " columns in row " + i); //TODO Has to be changed
            }
            // FULL CSV LINE FORMAT EXAMPLE: Chemisty;CHEM,PHY;
            String subjectName = line[0].trim();
            String subjectColor = line[2].trim();
            Subject subject = new Subject();
            if (!line[1].isBlank()) {
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
                        throw new IllegalArgumentException("Roomtype " + roomTypeString + " does not exist. Please check CSV.");
                    }
                    subject.setRequiredRoomTypes(Arrays.asList(requiredRoomTypes));
                }
            }
            String[] colorCodes = subjectColor.split(",");
            subject.setSubjectColor(new RgbColor(Integer.parseInt(colorCodes[0]), Integer.parseInt(colorCodes[1]), Integer.parseInt(colorCodes[2])));
            subject.setSubjectName(subjectName);
            dataRepository.addSubject(subject);
        }
    }

    public static void createClassSubjectFromCSV(String[] lines, DataRepository dataRepository) { // TODO add unit tests
        for (int i = 1; i < lines.length; i++) {
            String[] line = lines[i].toLowerCase().split(";");
            if (line.length != 6) {
                throw new IllegalArgumentException("ClassSubject CSV is ONLY allowed to have 6 columns! Found " + line.length + " columns in row " + i);
            }
            // FULL CSV LINE FORMAT EXAMPLE: chemistry;john doe;4;true;false;
            Subject subject = dataRepository.getSubjectByNameAndCheckIfExists(line[0].trim().toLowerCase());
            Teacher teacher = dataRepository.getTeacherByNameAndCheckIfExists(line[1].trim().toLowerCase());
            short weeklyHours = Short.parseShort(line[2].trim());
            boolean requiresDoublePeriod = Boolean.parseBoolean(line[3].trim());
            boolean isBetterDoublePeriod = Boolean.parseBoolean(line[4].trim());
            String className = line[5].trim();

            if (subject == null) {
                throw new IllegalArgumentException("Subject " + line[0] + " does not exist. Please check the CSV.");
            }

            if (teacher == null) {
                throw new IllegalArgumentException("Teacher " + line[1] + " does not exist. Please check the CSV.");
            }


            ClassSubject classSubject = new ClassSubject();
            classSubject.setTeacher(teacher);
            classSubject.setSubject(subject);
            classSubject.setWeeklyHours(weeklyHours);
            classSubject.setRequiresDoublePeriod(requiresDoublePeriod);
            classSubject.setBetterDoublePeriod(isBetterDoublePeriod);
            classSubject.setClassName(className);
            dataRepository.addClassSubject(classSubject);
        }
    }

    public static String[] getLinesFromCSV(String filePath) {
        String[] result;
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
