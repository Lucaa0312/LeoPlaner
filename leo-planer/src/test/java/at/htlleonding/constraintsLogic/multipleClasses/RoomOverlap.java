package at.htlleonding.constraintsLogic.multipleClasses;

import org.junit.jupiter.api.*;

import jakarta.inject.Inject;
import at.htlleonding.leoplaner.data.CSVManager;
import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Timetable;
import io.quarkus.test.junit.QuarkusTest;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

@QuarkusTest
public class RoomOverlap {
    @BeforeEach
    public void injectTestCsvDataNew() {
        final String baseDir = "../script/fakerGeneration/csvOutput/";

        final String teacherCSVPath = baseDir + "teachers.csv";
        final String classSubjectCSVPath = baseDir + "classSubjects.csv";
        final String roomCSVPath = baseDir + "rooms.csv";

        final String subjectCSVPath = "src/files/csvFiles/test1/testSubject.csv";

        CSVManager.processCSV(subjectCSVPath, dataRepository);
        CSVManager.processCSV(teacherCSVPath, dataRepository);
        CSVManager.processCSV(roomCSVPath, dataRepository);
        CSVManager.processCSV(classSubjectCSVPath, dataRepository);

        this.dataRepository.clearTimetableData();
        this.dataRepository.initRandomTimetableForAllClasses();
    }

    @Inject
    DataRepository dataRepository;

    @Test
    void testRoomNotOverlappingInMultipleClasses() {
        Map<Room, List<Period>> roomTakenPeriods = new HashMap<>();
        var timetablesAllClasses = this.dataRepository.getCurrentTimetableList()
                .values();

        for (Timetable timetable : timetablesAllClasses) {
            for (ClassSubjectInstance csi : timetable.getClassSubjectInstances()) {
                if (csi == null || csi.getClassSubject() == null) {
                    continue;
                }
                final Room room = csi.getRoom();
                final Period period = csi.getPeriod();

                List<Period> takenPeriods = roomTakenPeriods.computeIfAbsent(room, k -> new ArrayList<>());

                for (Period periodTaken : takenPeriods) {
                    if (periodTaken.getSchoolDays() == period.getSchoolDays()
                            && periodTaken.getSchoolHour() == period.getSchoolHour()) {
                        fail(room.getRoomName() + " is double fouled like two classes at the same time "
                                + period.getSchoolDays() + " " + period.getSchoolHour());
                    }
                }

                List<Period> takenPeriodListForRoom = roomTakenPeriods
                        .get(room);
                takenPeriodListForRoom.add(period);

                roomTakenPeriods.put(room, takenPeriodListForRoom);
            }
        }
    }
}
