package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Teacher;

import java.util.ArrayList;

public class SimulatedAnnealingAlgorithm {
    private ClassSubjectInstance[] currTimeTable;
    private ClassSubjectInstance[] nextTimeTable;
    private ArrayList<Room> rooms;
    private ArrayList<Teacher> teachers;
    private double temperature;

    public void duplicateTimeTableIntoNextTimeTable() {

    }
    public boolean acceptSolution(int costCurrTimeTable, int costNextTimeTable, double temperature) {
        return true;
    }
    public void pushTemperature(double pushAmount) {

    }
    public boolean swapPeriods(short firstIndex, short secondIndex) {
        return true;
    }
    public boolean changeRoom(ClassSubjectInstance classSubject) {
        return true;
    }
    public boolean changeTeacher(ClassSubjectInstance classSubject) {
        return true;
    }
    public void decreaseTemperature(double temperature) {

    }
    public int determineCost(ClassSubjectInstance[] timetable) {
        return 1;
    }
}
