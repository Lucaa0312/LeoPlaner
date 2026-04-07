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

    private final String filePath = "src/files/excelFiles/export/test1.xlsx";

    public void exportTimetable() throws Exception {
        final SchoolClass schoolClass = this.dataRepository.getSchoolClassById(1L);
       
        Map<String, Timetable> allTimetables = dataRepository.getAllTimetables();

        Timetable timetable = allTimetables.get(schoolClass.getClassName());
        // TimetableDTO timetable1 = UtilBuildFunctions.createTimetableDTO(allTimetables.get(schoolClass.getClassName()));
        // System.out.println(timetable); // returns Timetable<null>
       // System.out.println(timetable1); // returns TimetableDTO with all data

        Workbook workbook = new XSSFWorkbook(); 
        Sheet timetableSheet = workbook.createSheet();
        
        Row header = timetableSheet.createRow(0);
        header.createCell(0).setCellValue("CSI");
        header.createCell(1).setCellValue("TWH");
        header.createCell(2).setCellValue("Cost");
        header.createCell(3).setCellValue("Temp");
        
        Row row = timetableSheet.createRow(1);
        row.createCell(1).setCellValue(timetable.getTotalWeeklyHours());
        row.createCell(2).setCellValue(timetable.getCostOfTimetable());
        row.createCell(3).setCellValue(timetable.getTempAtTimetable());


        int rowIdx = 2;
        for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            if (!false) {
                System.out.println(csi.getId());
                Row dataRow = timetableSheet.createRow(rowIdx++);
                dataRow.createCell(0).setCellValue(csi.getId());
            }
    
        }

        try (FileOutputStream fileOut = new FileOutputStream(filePath)) {
            workbook.write(fileOut);
        }
        
    }


 
    private void createSubjectSheet(Workbook workbook, Subject subject) {
        Sheet sheet = workbook.createSheet("Subjects");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Name");
        header.createCell(2).setCellValue("Color");
        header.createCell(3).setCellValue("Symbol");
        header.createCell(4).setCellValue("Required Room Types");

        Row dataRow = sheet.createRow(1);
        dataRow.createCell(0).setCellValue(subject.getId());
        dataRow.createCell(1).setCellValue(subject.getSubjectName());
        dataRow.createCell(2).setCellValue(subject.getSubjectColor().toString());
        dataRow.createCell(3).setCellValue(subject.getSubjectSymbol());
        int rowIndex = 3;
        for (RoomTypes rt : subject.getRequiredRoomTypes()) {
            Row rtRow = sheet.createRow(rowIndex++);
            rtRow.createCell(4).setCellValue(rt.toString());
        }   
        
        
    }
        
}
