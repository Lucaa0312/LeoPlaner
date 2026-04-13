package at.htlleonding.leoplaner.data;

import java.io.File;
import java.io.FileOutputStream;
import java.util.*;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

@ApplicationScoped
public class ExcelManager {
    @Inject
    DataRepository dataRepository;

    private final String filePath = "src/files/excelFiles/export/test1.xlsx";

    public void exportTimetable() throws Exception {
        Workbook workbook = new XSSFWorkbook();

        final SchoolClass schoolClass = this.dataRepository.getSchoolClassById(1L);

        Map<String, Timetable> allTimetables = dataRepository.getAllTimetables();

        Timetable timetable = allTimetables.get(schoolClass.getClassName());
        // TimetableDTO timetable1 =
        // UtilBuildFunctions.createTimetableDTO(allTimetables.get(schoolClass.getClassName()));
        // System.out.println(timetable); // returns Timetable<null>
        // System.out.println(timetable1); // returns TimetableDTO with all data

        Sheet timetableSheet = workbook.createSheet("Timetable");

        Row header = timetableSheet.createRow(0);
        header.createCell(0).setCellValue("CSI Id");
        header.createCell(1).setCellValue("CS Id");
        header.createCell(2).setCellValue("Total weekly hours");
        header.createCell(3).setCellValue("Cost");
        header.createCell(4).setCellValue("Temp");
        header.createCell(5).setCellValue("SchoolClass Id");
        header.createCell(6).setCellValue("SchoolClass Name");

        Row row = timetableSheet.createRow(1);
        row.createCell(2).setCellValue(timetable.getTotalWeeklyHours());
        row.createCell(3).setCellValue(timetable.getCostOfTimetable());
        row.createCell(4).setCellValue(timetable.getTempAtTimetable());
        row.createCell(5).setCellValue(timetable.getSchoolClass().getId());
        row.createCell(6).setCellValue(timetable.getSchoolClass().getClassName());

        List<ClassSubject> classSubjects = new LinkedList<>();

        int rowIdx = 2;
        for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            if (!false) {
                Row dataRow = timetableSheet.createRow(rowIdx++);
                dataRow.createCell(0).setCellValue(csi.getId());
                dataRow.createCell(1).setCellValue(csi.getClassSubject().getId());

                if (!classSubjects.contains(csi.getClassSubject()))
                    classSubjects.add(csi.getClassSubject());
            }
        }

        createClassSubjectSheet(classSubjects, workbook);
        createSubjectSheet(dataRepository.getAllSubjects(), workbook);
        createRoomSheet(dataRepository.getAllRooms(), workbook);
        createTeacherSheet(dataRepository.getAllTeachers(), workbook);

        try (FileOutputStream fileOut = new FileOutputStream(filePath)) {
            workbook.write(fileOut);
        }

    }

    private void createSubjectSheet(List<Subject> subjects, Workbook workbook) {
        Sheet subjectSheet = workbook.createSheet("Subjects");

        Row header = subjectSheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Name");
        header.createCell(2).setCellValue("Symbol");
        header.createCell(3).setCellValue("Required Room Types");

        int rtindex = 1;

        for (Subject subject : subjects) {
            Row dataRow = subjectSheet.createRow(rtindex++);

            dataRow.createCell(0).setCellValue(subject.getId());
            dataRow.createCell(1).setCellValue(subject.getSubjectName());
            dataRow.createCell(2).setCellValue(subject.getSubjectSymbol());
            dataRow.createCell(2).setCellValue(subject.getSubjectSymbol());

            String roomTypesCell = "";
            for (RoomTypes rt : subject.getRequiredRoomTypes()) {
                roomTypesCell += rt.toString() + ", ";
            }

            if (roomTypesCell.length() > 2) {
                roomTypesCell = roomTypesCell.substring(0, roomTypesCell.length() - 2);
            }

            dataRow.createCell(3).setCellValue(roomTypesCell);
        }
    }

    private void createClassSubjectSheet(List<ClassSubject> classSubjects, Workbook workbook) {
        Sheet classSubjectSheet = workbook.createSheet("ClassSubjects");

        Row header = classSubjectSheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Subject Id");
        header.createCell(2).setCellValue("Subject Symbol");
        header.createCell(3).setCellValue("Teacher Id");
        header.createCell(4).setCellValue("Teacher Symbol");
        header.createCell(5).setCellValue("Weekly Hours");
        header.createCell(6).setCellValue("Requires Double Period");
        header.createCell(7).setCellValue("Is better as Double Period");

        int rtindex = 1;

        for (ClassSubject subject : classSubjects) {
            Row dataRow = classSubjectSheet.createRow(rtindex++);

            dataRow.createCell(0).setCellValue(subject.getId());
            dataRow.createCell(1).setCellValue(subject.getSubject().getId());
            dataRow.createCell(2).setCellValue(subject.getSubject().getSubjectSymbol());
            dataRow.createCell(3).setCellValue(subject.getTeacher().getId());
            dataRow.createCell(4).setCellValue(subject.getTeacher().getNameSymbol());
            dataRow.createCell(5).setCellValue(subject.getWeeklyHours());
            dataRow.createCell(6).setCellValue(subject.isRequiresDoublePeriod());
            dataRow.createCell(7).setCellValue(subject.isBetterDoublePeriod());
        }
    }

    private void createRoomSheet(List<Room> rooms, Workbook workbook) {
        Sheet roomSheet = workbook.createSheet("Rooms");

        Row header = roomSheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Number");
        header.createCell(2).setCellValue("Name");
        header.createCell(3).setCellValue("Short");
        header.createCell(4).setCellValue("Room Type");

        int rtindex = 1;

        for (Room room : rooms) {
            Row dataRow = roomSheet.createRow(rtindex++);

            dataRow.createCell(0).setCellValue(room.getId());
            dataRow.createCell(1).setCellValue(room.getRoomNumber());
            dataRow.createCell(2).setCellValue(room.getRoomName());
            dataRow.createCell(3).setCellValue(room.getNameShort());

            String roomTypesCell = "";
            for (RoomTypes rt : room.getRoomTypes()) {
                roomTypesCell += rt.toString() + ", ";
            }

            if (roomTypesCell.length() > 2) {
                roomTypesCell = roomTypesCell.substring(0, roomTypesCell.length() - 2);
            }

            dataRow.createCell(4).setCellValue(roomTypesCell);
        }
    }

    private void createTeacherSheet(List<Teacher> teachers, Workbook workbook) {
        Sheet teacherSheet = workbook.createSheet("Teachers");

        Row header = teacherSheet.createRow(0);
        header.createCell(0).setCellValue("Id");
        header.createCell(1).setCellValue("Name");
        header.createCell(2).setCellValue("Symbol");
        header.createCell(3).setCellValue("Teaching Subjects Ids");
        header.createCell(4).setCellValue("Teaching Subjects Symbols");

        int rtindex = 1;

        for (Teacher teacher : teachers) {
            List<Long> ids = teacher.getTeachingSubject()
                    .stream()
                    .map(Subject::getId)
                    .collect(Collectors.toList());

            List<String> symbols = teacher.getTeachingSubject()
                    .stream()
                    .map(Subject::getSubjectSymbol)
                    .collect(Collectors.toList());

            Row dataRow = teacherSheet.createRow(rtindex++);

            dataRow.createCell(0).setCellValue(teacher.getId());
            dataRow.createCell(1).setCellValue(teacher.getTeacherName());
            dataRow.createCell(2).setCellValue(teacher.getNameSymbol());

            String sId = "";
            String sSy = "";
            for (Long id : ids) {
                sId += id + ", ";
            }
            for (String s : symbols) {
                sSy += s + ", ";
            }

            if (sId.length() > 2) {
                sId = sId.substring(0, sId.length() - 2);
            }

            if (sSy.length() > 2) {
                sSy = sSy.substring(0, sSy.length() - 2);
            }

            dataRow.createCell(3).setCellValue(sId);
            dataRow.createCell(4).setCellValue(sSy);
        }
    }

    @Transactional
    public void importAll() throws Exception {
        try (Workbook importWorkbook = WorkbookFactory.create(new File(filePath))) {
            DataFormatter formatter = new DataFormatter();

            importSubjects(importWorkbook.getSheet("Subjects"), formatter);
            importTeachers(importWorkbook.getSheet("Teachers"), formatter);
            importRooms(importWorkbook.getSheet("Rooms"), formatter);

            importClassSubjects(importWorkbook.getSheet("ClassSubjects"), formatter);

            // importTimetable(importWorkbook.getSheet("Timetable"), formatter);
        }
    }

    private void importSubjects(Sheet sheet, DataFormatter fmt) {
        boolean isFirstRow = true;
        for (Row row : sheet) {
            if (isFirstRow) {
                isFirstRow = false;
                continue;
            }

            Subject s = new Subject();

            s.setSubjectName(fmt.formatCellValue(row.getCell(1)));
            s.setSubjectSymbol(fmt.formatCellValue(row.getCell(2)));

            String roomTypeString = fmt.formatCellValue(row.getCell(3));
            List<RoomTypes> roomTypes = new ArrayList<>();
            if (!roomTypeString.isEmpty()) {
                String[] rts = roomTypeString.split(",\\s*");
                for (String rt : rts) {
                    if (!rt.isBlank()) {
                        roomTypes.add(RoomTypes.valueOf(rt.trim()));
                    }
                }
            }
            s.setRequiredRoomTypes(roomTypes);

            dataRepository.addSubject(s);
        }
    }

    private void importTeachers(Sheet sheet, DataFormatter fmt) {
        boolean isFirstRow = true;
        for (Row row : sheet) {
            if (isFirstRow) {
                isFirstRow = false;
                continue;
            }

            Teacher t = new Teacher();
            t.setTeacherName(fmt.formatCellValue(row.getCell(1)));
            t.setNameSymbol(fmt.formatCellValue(row.getCell(2)));

            String idString = fmt.formatCellValue(row.getCell(3));
            if (!idString.isEmpty()) {
                String[] ids = idString.split(",\\s*");
                for (String id : ids) {
                    if (!id.isBlank()) {
                        Subject s = Subject.findById(Long.parseLong(id));
                        if (s != null)
                            t.getTeachingSubject().add(s);
                    }
                }
            }
            dataRepository.addTeacher(t);
        }
    }

    private void importRooms(Sheet sheet, DataFormatter fmt) {
        if (sheet == null)
            return;

        for (Row row : sheet) {
            if (row.getRowNum() == 0)
                continue;

            Room room = new Room();
            room.setRoomNumber(Short.parseShort(fmt.formatCellValue(row.getCell(1))));
            room.setRoomName(fmt.formatCellValue(row.getCell(2)));
            room.setNameShort(fmt.formatCellValue(row.getCell(3)));

            String roomTypeString = fmt.formatCellValue(row.getCell(4));
            List<RoomTypes> roomTypes = new ArrayList<>();
            if (!roomTypeString.isEmpty()) {
                String[] rts = roomTypeString.split(",\\s*");
                for (String rt : rts) {
                    if (!rt.isBlank()) {
                        roomTypes.add(RoomTypes.valueOf(rt.trim()));
                    }
                }
            }
            room.setRoomTypes(roomTypes);

            dataRepository.addRoom(room);
        }
    }

    private void importClassSubjects(Sheet sheet, DataFormatter fmt) {
        for (Row row : sheet) {
            if (row.getRowNum() == 0)
                continue;
            ClassSubject cs = new ClassSubject();

            cs.setSubject(Subject.findById(Long.parseLong(fmt.formatCellValue(row.getCell(1)))));
            cs.setTeacher(Teacher.findById(Long.parseLong(fmt.formatCellValue(row.getCell(3)))));

            cs.setWeeklyHours(Integer.parseInt(fmt.formatCellValue(row.getCell(5))));
            cs.setRequiresDoublePeriod(Boolean.parseBoolean(fmt.formatCellValue(row.getCell(6))));
            cs.setBetterDoublePeriod(Boolean.parseBoolean(fmt.formatCellValue(row.getCell(7))));
            dataRepository.addClassSubject(cs);
        }
    }

    private void importTimetable(Sheet sheet, DataFormatter fmt) {
        Row metaRow = sheet.getRow(1);
        if (metaRow == null)
            return;

        String className = fmt.formatCellValue(metaRow.getCell(6));

        SchoolClass sc = dataRepository.getSchoolClassByName(className);

        Timetable timetable = new Timetable();
        timetable.setSchoolClass(sc);

        timetable.setTotalWeeklyHours(Integer.parseInt(fmt.formatCellValue(metaRow.getCell(2))));
        timetable.setCostOfTimetable(Integer.parseInt(fmt.formatCellValue(metaRow.getCell(3))));
        timetable.setTempAtTimetable(Double.parseDouble(fmt.formatCellValue(metaRow.getCell(4))));

        for (int i = 2; i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || row.getCell(0) == null)
                continue; // Skip empty rows

            ClassSubjectInstance csi = new ClassSubjectInstance();
            csi.setId(Long.parseLong(fmt.formatCellValue(row.getCell(0))));

            Long csId = Long.parseLong(fmt.formatCellValue(row.getCell(1)));
            csi.setClassSubject(dataRepository.getClassSubjectById(csId));

            timetable.getClassSubjectInstances().add(csi);
        }

        // dataRepository.addTimetable(timetable);
    }
}
