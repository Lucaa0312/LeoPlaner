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
        header.createCell(0).setCellValue("CSI");
        header.createCell(1).setCellValue("TWH");
        header.createCell(2).setCellValue("Cost");
        header.createCell(3).setCellValue("Temp");
        
        Row row = timetableSheet.createRow(1);
        row.createCell(1).setCellValue(timetable.getTotalWeeklyHours());
        row.createCell(2).setCellValue(timetable.getCostOfTimetable());
        row.createCell(3).setCellValue(timetable.getTempAtTimetable());

        List<Subject> subjects = new LinkedList<>();

        int rowIdx = 2;
        for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
            if (!false) {
                System.out.println(csi.getId());
                Row dataRow = timetableSheet.createRow(rowIdx++);
                dataRow.createCell(0).setCellValue(csi.getId());
                subjects.add(csi.getClassSubject().getSubject());
            }
        }

        createSubjectSheet(subjects);


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
        
}
