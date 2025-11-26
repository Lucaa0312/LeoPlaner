package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.Timetable;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.Random;

public class SimulatedAnnealingAlgorithm {
    private Timetable currTimeTable;
    private Timetable nextTimeTable;
    private ArrayList<Room> rooms;
    private ArrayList<Teacher> teachers;
    private final double INIT_TEMPERATURE = 1000.0;
    private final int ITERATIONS = 100000;
    private final double COOLING_RATE = 0.995;

    @Inject 
    DataRepository dataRepository;


    public void algorithmLoop() {
        this.currTimeTable = this.dataRepository.getCurrentTimetable();
        Random random = new Random();
        for (int i = 0; i < ITERATIONS; i++) {
            int indexesAmount = this.currTimeTable.getClassSubjectInstances().size();
            int ranIndex1 = random.nextInt(0, indexesAmount);
            int ranIndex2;

            do {
                ranIndex2 = random.nextInt(0, indexesAmount);
            } while (ranIndex2 == ranIndex1);

            
            
        }
    }

    public void chooseRandomNeighborFunction(int index1, int index2) {
        Random random = new Random();

        int ranNumber = random.nextInt(1, 2);
        
        switch(ranNumber) {
            case 1:
              swapPeriods(index1, index2);
              break;
            case 2:
              changePeriod(index1);
              break;
        }
    }

    public void duplicateTimeTableIntoNextTimeTable() {

    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable, final double temperature) {
        return true;
    }

    public void pushTemperature(final double pushAmount) {

    }

    public void swapPeriods(final int firstIndex, final int secondIndex) {
        this.nextTimeTable = this.currTimeTable.switchTwoClassSubjectInstancesAndReturn(firstIndex, secondIndex);
    }

    public void changePeriod(int index) {
        this.nextTimeTable = this.currTimeTable.giveClassSubjectRandomPeriodAndReturn(index);
    }

    public boolean changeRoom(final ClassSubjectInstance classSubject) {
        return true;
    }

    public boolean changeTeacher(final ClassSubjectInstance classSubject) {
        return true;
    }

    public void decreaseTemperature(final double temperature) {

    }

    public int determineCost(final ClassSubjectInstance[] timetable) {
        return 1;
    }

    public Timetable getCurrTimeTable() {
        return currTimeTable;
    }

    public void setCurrTimeTable(final Timetable currTimeTable) {
        this.currTimeTable = currTimeTable;
    }

    public Timetable getNextTimeTable() {
        return nextTimeTable;
    }

    public void setNextTimeTable(final Timetable nextTimeTable) {
        this.nextTimeTable = nextTimeTable;
    }

    public ArrayList<Room> getRooms() {
        return rooms;
    }

    public void setRooms(final ArrayList<Room> rooms) {
        this.rooms = rooms;
    }

    public ArrayList<Teacher> getTeachers() {
        return teachers;
    }

    public void setTeachers(final ArrayList<Teacher> teachers) {
        this.teachers = teachers;
    }
}
