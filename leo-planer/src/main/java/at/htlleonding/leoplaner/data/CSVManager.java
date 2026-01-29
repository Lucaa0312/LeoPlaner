package at.htlleonding.leoplaner.data;

import at.htlleonding.leoplaner.dto.ParsedDayHour;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

public class CSVManager {
    final static String teacherType = "teacher";
    final static String roomType = "room";
    final static String subjectType = "subject";
    final static String classSubjectType = "classsubject"; // TODO make finals name UPPERCASE

    public static boolean processCSV(final String filePath, final DataRepository dataRepository) {
        final String[] lines = getLinesFromCSV(filePath);

        if (lines == null || lines.length == 0) {
            return false;
        }

        final String type = lines[0].split(";")[0].toLowerCase();

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

    public static void createTeacherFromCSV(final String[] lines, final DataRepository dataRepository) {
        for (int i = 1; i < lines.length; i++) {
            final String[] line = lines[i].split(";");
            if (line.length != 6) {
                // throw new IllegalArgumentException("Teacher CSV is only allowed to have 6
                // columns! Found " + line.length + " columns in row " + i);
            }
            // FULL CSV FORMAT EXAMPLE: ;John Doe;JD;math,physics,chemistry.CHEM,HISTORY;
            // (.CHEM is roomtype)

            final String teacherName = line[0].trim();
            final String nameSymbol = line[1].trim();

            final ArrayList<Subject> takenSubjects = new ArrayList<>(); // CSV FORMAT: ;math,physics(maybe roomtypes
                                                                        // with ..);
            final String[] subjects = line[2].split(",");
            for (final String subjectName : subjects) {
                final Subject subject = dataRepository
                        .getSubjectByNameAndCheckIfExists(subjectName.trim().toLowerCase());

                if (subject == null) {
                    throw new IllegalArgumentException(
                            "Subject " + subjectName + " does not exist. Please check the CSV.");
                }
                takenSubjects.add(subject);
            }

            final Teacher teacher = new Teacher();
            teacher.setTeacherName(teacherName);
            teacher.setNameSymbol(nameSymbol);
            teacher.setTeachingSubject(takenSubjects);

            // CSV FORMAT Nonworking/Nonpreferred ;Day-hour,hour:Day2-hour,hour
            List<TeacherNonWorkingHours> nonWorkingHours = new ArrayList<>();
            parseDayHourString(line[3], parsed -> {
                final TeacherNonWorkingHours nwh = new TeacherNonWorkingHours();
                nwh.setDay(parsed.day());
                nwh.setSchoolHour(parsed.hour());
                // nwh.setTeacher(teacher);
                nonWorkingHours.add(nwh);
            });
            teacher.setTeacher_non_working_hours(nonWorkingHours);

            List<TeacherNonPreferredHours> nonPreferredHours = new ArrayList<>();
            parseDayHourString(line[4], parsed -> {
                TeacherNonPreferredHours nph = new TeacherNonPreferredHours();
                nph.setDay(parsed.day());
                nph.setSchoolHour(parsed.hour());
                // nph.setTeacher(teacher);
                nonPreferredHours.add(nph);
            });
            teacher.setTeacher_non_preferred_hours(nonPreferredHours);

            dataRepository.addTeacher(teacher);
        }
    }

    private static void parseDayHourString(String stringValue, Consumer<ParsedDayHour> consumerBob) {
        if (stringValue == null || stringValue.isBlank())
            return;

        String[] allNonWorkingDays = stringValue.split(":");

        for (String allNonWorkingDay : allNonWorkingDays) {
            String[] dayAndHours = allNonWorkingDay.split("-");

            SchoolDays day = SchoolDays.valueOf(dayAndHours[0].trim());
            String[] schoolHours = dayAndHours[1].split(",");

            for (String schoolHour : schoolHours) {
                consumerBob.accept(new ParsedDayHour(day, Integer.parseInt(schoolHour.trim())));
            }

        }

    }

    public static void createRoomFromCSV(final String[] lines, final DataRepository dataRepository) {
        for (int i = 1; i < lines.length; i++) {
            final String[] line = lines[i].toLowerCase().split(";");
            if (line.length != 4) {
                throw new IllegalArgumentException(
                        "Room CSV is only allowed to have 4 columns! Found " + line.length + " columns in row " + i);
            }
            // FULL CSV FORMAT EXAMPLE: 101;EDUARD;;;CHEM,PHY;

            final short roomNumber = Short.parseShort(line[0]);
            final String roomName = line[1].trim();
            final String nameShort = line[2].trim();

            final String[] roomTypesStrings = line[3].split(","); // TODO handle empty prefix/suffix
            final RoomTypes[] roomTypesArray = new RoomTypes[roomTypesStrings.length];

            int index = 0;
            for (final String roomTypeString : roomTypesStrings) {
                RoomTypes roomType = null;
                try {
                    roomType = RoomTypes.valueOf(roomTypeString.trim().toUpperCase());
                    roomTypesArray[index] = roomType;
                    index++;
                } catch (final IllegalArgumentException e) {
                    System.out.println("Roomtype: " + roomType + " does not exist");
                }
            }

            final Room room = new Room();
            room.setRoomNumber(roomNumber);
            room.setRoomName(roomName);
            room.setNameShort(nameShort);
            room.setRoomTypes(Arrays.stream(roomTypesArray).toList());
            dataRepository.addRoom(room);
        }
    }

    public static void createSubjectFromCSV(final String[] lines, final DataRepository dataRepository) {
        for (int i = 1; i < lines.length; i++) {
            final String[] line = lines[i].toLowerCase().split(";");
            if (line.length != 3) {
                throw new IllegalArgumentException(
                        "Subject CSV is only allowed to have 3 columns! Found " + line.length + " columns in row " + i); // TODO
                                                                                                                         // Has
                                                                                                                         // to
                                                                                                                         // be
                                                                                                                         // changed
            }
            // FULL CSV LINE FORMAT EXAMPLE: Chemisty;CHEM,PHY;
            final String subjectName = line[0].trim();
            final String subjectColor = line[2].trim();
            final Subject subject = new Subject();
            if (!line[1].isBlank()) {
                final String[] requiredRoomTypesStrings = line[1].split(",");
                final RoomTypes[] requiredRoomTypes = new RoomTypes[requiredRoomTypesStrings.length];

                int index = 0;
                for (final String roomTypeString : requiredRoomTypesStrings) {
                    RoomTypes roomType;
                    try {
                        roomType = RoomTypes.valueOf(roomTypeString.trim().toUpperCase());
                        requiredRoomTypes[index] = roomType;
                        index++;
                    } catch (final IllegalArgumentException e) {
                        throw new IllegalArgumentException(
                                "Roomtype " + roomTypeString + " does not exist. Please check CSV.");
                    }
                    subject.setRequiredRoomTypes(Arrays.asList(requiredRoomTypes));
                }
            }
            final String[] colorCodes = subjectColor.split(",");
            subject.setSubjectColor(new RgbColor(Integer.parseInt(colorCodes[0]), Integer.parseInt(colorCodes[1]),
                    Integer.parseInt(colorCodes[2])));
            subject.setSubjectName(subjectName);
            dataRepository.addSubject(subject);
        }
    }

    public static void createClassSubjectFromCSV(final String[] lines, final DataRepository dataRepository) { // TODO
                                                                                                              // add
                                                                                                              // unit
                                                                                                              // tests
        for (int i = 1; i < lines.length; i++) {
            final String[] line = lines[i].toLowerCase().split(";");
            if (line.length != 6) {
                throw new IllegalArgumentException("ClassSubject CSV is ONLY allowed to have 6 columns! Found "
                        + line.length + " columns in row " + i);
            }
            // FULL CSV LINE FORMAT EXAMPLE: chemistry;john doe;4;true;false;
            final Subject subject = dataRepository.getSubjectByNameAndCheckIfExists(line[0].trim().toLowerCase());
            final Teacher teacher = dataRepository.getTeacherByNameAndCheckIfExists(line[1].trim().toLowerCase());
            final int weeklyHours = Integer.parseInt(line[2].trim());
            final boolean requiresDoublePeriod = Boolean.parseBoolean(line[3].trim());
            final boolean isBetterDoublePeriod = Boolean.parseBoolean(line[4].trim());
            final String className = line[5].trim();

            if (subject == null) {
                throw new IllegalArgumentException("Subject " + line[0] + " does not exist. Please check the CSV.");
            }

            if (teacher == null) {
                throw new IllegalArgumentException("Teacher " + line[1] + " does not exist. Please check the CSV.");
            }

            final ClassSubject classSubject = new ClassSubject();
            final SchoolClass schoolClass = new SchoolClass();
            schoolClass.setClassName(className);
            dataRepository.addSchoolClass(schoolClass);

            classSubject.setTeacher(teacher);
            classSubject.setSubject(subject);
            classSubject.setWeeklyHours(weeklyHours);
            classSubject.setRequiresDoublePeriod(requiresDoublePeriod);
            classSubject.setBetterDoublePeriod(isBetterDoublePeriod);
            classSubject.setSchoolClass(schoolClass);
            // classSubject.setClassName(className);
            dataRepository.addClassSubject(classSubject);
        }
    }

    public static String[] getLinesFromCSV(final String filePath) {
        String[] result;
        try {
            final Path path = Paths.get(filePath);
            final List<String> lines = Files.readAllLines(path);
            result = new String[lines.size()];

            for (int i = 0; i < lines.size(); i++) {
                result[i] = lines.get(i);
            }

        } catch (final IOException e) {
            throw new RuntimeException(e);
        }
        return result;
    }
}
