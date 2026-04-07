package at.htlleonding.leoplaner.data;

import at.htlleonding.leoplaner.dto.TimetableDTO;
import at.htlleonding.leoplaner.dto.ClassSubjectInstanceDTO;

import java.io.FileOutputStream;
import java.util.*;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import at.htlleonding.leoplaner.boundary.UtilBuildFunctions;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;


@ApplicationScoped
public class ExcelManager {
    @Inject
    DataRepository dataRepository;
    Workbook workbook = new XSSFWorkbook();

    private final String filePath = "src/files/excelFiles/export/test1.xlsx";

    public void exportTimetable() throws Exception {
        final SchoolClass schoolClass = this.dataRepository.getSchoolClassById(1L);
       
        Map<String, Timetable> allTimetables = dataRepository.getAllTimetables();

        Timetable timetable = allTimetables.get(schoolClass.getClassName());
        // TimetableDTO timetable1 = UtilBuildFunctions.createTimetableDTO(allTimetables.get(schoolClass.getClassName()));
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

                if (!classSubjects.contains(csi.getClassSubject())) classSubjects.add(csi.getClassSubject());
            }
        }

        createClassSubjectSheet(classSubjects);
        createSubjectSheet(dataRepository.getAllSubjects());

        // Write file
        try (FileOutputStream fileOut = new FileOutputStream(filePath)) {
            workbook.write(fileOut);
        }
        
    }

    private void createSubjectSheet(List<Subject> subjects) {
        Sheet subjectSheet = workbook.createSheet("Subjects");

        Row header = subjectSheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Name");
        header.createCell(2).setCellValue("Color");
        header.createCell(3).setCellValue("Symbol");
        header.createCell(4).setCellValue("Required Room Types");

        int rtindex = 1;

        for (Subject subject : subjects){
            Row dataRow = subjectSheet.createRow(rtindex++);

            dataRow.createCell(0).setCellValue(subject.getId());
            dataRow.createCell(1).setCellValue(subject.getSubjectName());
            dataRow.createCell(2).setCellValue(subject.getSubjectColorAsString());
            dataRow.createCell(3).setCellValue(subject.getSubjectSymbol());

            int cellIndex = 4;
            for (RoomTypes rt : subject.getRequiredRoomTypes()) dataRow.createCell(cellIndex++).setCellValue(rt.toString());
         }
    }

    private void createClassSubjectSheet(List<ClassSubject> classSubjects) {
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

        for (ClassSubject subject : classSubjects){
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

/* 
    private void createRoomSheet(List<Room> rooms) {
        Sheet subjectSheet = workbook.createSheet("Subjects");

        Row header = subjectSheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Name");
        header.createCell(2).setCellValue("Color");
        header.createCell(3).setCellValue("Symbol");
        header.createCell(4).setCellValue("Required Room Types");

        int rtindex = 1;

        for (Subject subject : subjects){
            Row dataRow = subjectSheet.createRow(rtindex++);

            dataRow.createCell(0).setCellValue(subject.getId());
            dataRow.createCell(1).setCellValue(subject.getSubjectName());
            dataRow.createCell(2).setCellValue(subject.getSubjectColorAsString());
            dataRow.createCell(3).setCellValue(subject.getSubjectSymbol());

            int cellIndex = 4;
            for (RoomTypes rt : subject.getRequiredRoomTypes()) dataRow.createCell(cellIndex++).setCellValue(rt.toString());
         }
    }
        */
}
