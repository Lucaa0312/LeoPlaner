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
        System.out.println(schoolClass.getClassName());

        // Call ONCE, store it
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


/* 
    private void createEmployeeSheet(Workbook workbook, List<Employee> employees) {
        Sheet sheet = workbook.createSheet("Employees");
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("ID");
        header.createCell(1).setCellValue("Name");
        header.createCell(2).setCellValue("Company ID"); // The "Foreign Key"

        int rowIdx = 1;
        for (Employee e : employees) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(e.id);
            row.createCell(1).setCellValue(e.fullName);
            row.createCell(2).setCellValue(e.company.id); // Linking back to Sheet 1
        }
    }
        */
}
