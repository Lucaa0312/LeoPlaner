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
    private double temperature = 1000.0;
    private final int ITERATIONS = 100000;
    private final double COOLING_RATE = 0.995;
    public static final double BOLTZMANN_CONSTANT = 1; //maybe adjust real constant: 1.380649e-23;

    @Inject 
    DataRepository dataRepository;


    public void algorithmLoop() {
        this.currTimeTable = this.dataRepository.getCurrentTimetable();
        final Random random = new Random();
        for (int i = 0; i < ITERATIONS; i++) {
            final int indexesAmount = this.currTimeTable.getClassSubjectInstances().size();
            final int ranIndex1 = random.nextInt(0, indexesAmount);
            int ranIndex2;

            do {
                ranIndex2 = random.nextInt(0, indexesAmount);
            } while (ranIndex2 == ranIndex1);
            
            chooseRandomNeighborFunction(ranIndex1, ranIndex2);
            
            final int costCurrTimeTable = determineCost(this.currTimeTable);
            final int costNextTimeTable = determineCost(this.nextTimeTable);
          
            final boolean acceptSolution = acceptSolution(costCurrTimeTable, costNextTimeTable);
            if (acceptSolution) {
                this.currTimeTable = this.nextTimeTable;
            }

            decreaseTemperature();
        }
    }

    public int determineCost(final Timetable timetable) {
        //TODO if classsubject instance on friday, high cost
        //  the later the period the more cost
        //  if against classSubject.isBetterDoublePeriod higher cost
        //  
        return 0;
    }

    public void chooseRandomNeighborFunction(final int index1, final int index2) {
        final Random random = new Random();

        final int ranNumber = random.nextInt(1, 2);
        
        switch(ranNumber) {
            case 1:
              swapPeriods(index1, index2);
              break;
            case 2:
              changePeriod(index1);
              break;
        }
    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable) {
        final int deltaCost = costNextTimeTable - costCurrTimeTable; 
        
        if (deltaCost > 0) { //next solution is better, always accept 
            return true;
        }
        
        final double probability = Math.exp(-deltaCost / (BOLTZMANN_CONSTANT * temperature));

        return Math.random() < probability;
    }

    public void pushTemperature(final double pushAmount) {

    }

    public void swapPeriods(final int firstIndex, final int secondIndex) {
        this.nextTimeTable = this.currTimeTable.switchTwoClassSubjectInstancesAndReturn(firstIndex, secondIndex);
    }

    public void changePeriod(final int index) {
        this.nextTimeTable = this.currTimeTable.giveClassSubjectRandomPeriodAndReturn(index);
    }

    public boolean changeRoom(final ClassSubjectInstance classSubject) {
        return true;
    }

    public boolean changeTeacher(final ClassSubjectInstance classSubject) {
        return true;
    }

    public void decreaseTemperature() {
        this.temperature *= COOLING_RATE;
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
