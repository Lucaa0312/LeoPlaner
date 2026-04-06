package at.htlleonding.leoplaner.data;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import jakarta.enterprise.context.ApplicationScoped;

@ApplicationScoped
public class ExcelManager {
    private static final String filePath = "leo-planer/src/files/excelFiles/export/test1.xlsx";

    public static void exportTimetable() throws Exception {
        Workbook workbook = new XSSFWorkbook(); 
        Sheet timetableSheet = workbook.createSheet();
        
        Row row = timetableSheet.createRow(0);
        row.createCell(0).setCellValue("Test67");

        try (FileOutputStream fileOut = new FileOutputStream(filePath)) {
            workbook.write(fileOut);
        }
        
    }

    public static void main(String[] args) {
        try {
            ExcelManager.exportTimetable();
        } catch (Exception e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
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
