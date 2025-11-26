package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.Timetable;

import java.util.ArrayList;

public class SimulatedAnnealingAlgorithm {
    private Timetable currTimeTable;
    private Timetable nextTimeTable;
    private ArrayList<Room> rooms;
    private ArrayList<Teacher> teachers;
    private final double INIT_TEMPERATURE = 1000.0;
    private final int ITERATIONS = 100000;
    private final double COOLING_RATE = 0.995;

    public void duplicateTimeTableIntoNextTimeTable() {

    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable, final double temperature) {
        return true;
    }

    public void pushTemperature(final double pushAmount) {

    }

    public boolean swapPeriods(final short firstIndex, final short secondIndex) {
        return true;
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
