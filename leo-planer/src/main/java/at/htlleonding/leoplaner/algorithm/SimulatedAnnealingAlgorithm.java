package at.htlleonding.leoplaner.algorithm;

import at.htlleonding.leoplaner.data.ClassSubjectInstance;
import at.htlleonding.leoplaner.data.Period;
import at.htlleonding.leoplaner.data.DataRepository;
import at.htlleonding.leoplaner.data.Room;
import at.htlleonding.leoplaner.data.SchoolDays;
import at.htlleonding.leoplaner.data.Teacher;
import at.htlleonding.leoplaner.data.Timetable;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;


@ApplicationScoped
public class SimulatedAnnealingAlgorithm {
    private Timetable currTimeTable;
    private Timetable nextTimeTable;
    private ArrayList<Room> rooms;
    private ArrayList<Teacher> teachers;
    private double temperature = 1000.0; //could also go in the small number range like 1-0
    private final int ITERATIONS = 1000;
    private final double COOLING_RATE = 0.995;
    public static final double BOLTZMANN_CONSTANT = 1; //maybe adjust real constant: 1.380649e-23;
    //public static final double BOLTZMANN_CONSTANT = 1.380649e-23;

    @Inject 
    DataRepository dataRepository;


    public void algorithmLoop() {
        this.currTimeTable = this.dataRepository.getCurrentTimetable();
        final Random random = new Random();
        for (int i = 0; i < ITERATIONS; i++) { //main loop
            final int indexesAmount = this.currTimeTable.getClassSubjectInstances().size();
            final int ranIndex1 = random.nextInt(0, indexesAmount);
            int ranIndex2;

            do {
                ranIndex2 = random.nextInt(0, indexesAmount);
            } while (ranIndex2 == ranIndex1);
            //create 2 random non equal indexes

            if (this.currTimeTable.getClassSubjectInstances().get(ranIndex1).getPeriod().isLunchBreak() || this.currTimeTable.getClassSubjectInstances().get(ranIndex2).getPeriod().isLunchBreak()) {
                continue; //no reason to play around with lunch breaks only causes problems
            } //if more checks are needed then itll be moved to a helper method
      
            chooseRandomNeighborFunction(ranIndex1, ranIndex2);
            
            final int costCurrTimeTable = determineCost(this.currTimeTable);
            final int costNextTimeTable = determineCost(this.nextTimeTable);

            final boolean acceptSolution = acceptSolution(costCurrTimeTable, costNextTimeTable);
            if (acceptSolution) {
                this.currTimeTable = this.nextTimeTable;
            }

            decreaseTemperature();
            this.dataRepository.setCurrentTimetable(currTimeTable);
        }
        
        repairTimetable(currTimeTable);
        this.dataRepository.setCurrentTimetable(currTimeTable); //secure stuff
    }

    public void repairTimetable(Timetable timetable) {
        for (SchoolDays day : SchoolDays.values()) {
            List<ClassSubjectInstance> classesOnDay = timetable.getClassSubjectInstances().stream().filter(e -> e.getPeriod().getSchoolDays() == day)
            .sorted(Comparator.comparingInt(e -> e.getPeriod().getSchoolHour())).toList();

            moveDayToStartAtFirstHour(timetable, classesOnDay);
            closeAllGapsBetweenInstances(timetable, classesOnDay);
            searchAndImplementLunchBreaks(timetable, classesOnDay, day);
        }
    }

    public void moveDayToStartAtFirstHour(Timetable timetable, List<ClassSubjectInstance> classesOnDay) {
        if (classesOnDay.isEmpty()) {
            return;
        }

        Period firstClassOfTheDay = classesOnDay.getFirst().getPeriod();

        if (firstClassOfTheDay.getSchoolHour() != 1) {
            firstClassOfTheDay.setSchoolHour(1);
        }
    }

    public void closeAllGapsBetweenInstances(Timetable timetable, List<ClassSubjectInstance> classesOnDay) {
        for (int i = 0; i < classesOnDay.size() - 1; i++) {
            int currentEndOfClass = classesOnDay.get(i).getPeriod().getSchoolHour() + classesOnDay.get(i).getDuration();
            Period nextPeriod = classesOnDay.get(i + 1).getPeriod();

          if (nextPeriod.getSchoolHour() > currentEndOfClass) { //just means if the next class starts at a time bigger than what the previous class ended, hence resulting in a gap
              nextPeriod.setSchoolHour(currentEndOfClass);
          }
        }
    }

    public void searchAndImplementLunchBreaks(Timetable timetable, List<ClassSubjectInstance> classesOnDay, SchoolDays day) {
        if (classesOnDay.stream().anyMatch(e -> e.getPeriod().getSchoolHour() + e.getDuration() - 1 > 6)) {
            timetable.implementRandomLunchBreakOnDay(day);
        }
    }

    public int determineCost(final Timetable timetable) {
        //TODO if classsubject instance on friday, high cost
        //  the later the period the more cost
        //  if against classSubject.isBetterDoublePeriod higher cost
        //  maybe different rooms
        int cost = 0;
        for (ClassSubjectInstance classSubjectInstance : new ArrayList<>(timetable.getClassSubjectInstances())) { //create a copy to not have mofying conflicts
            Period period = classSubjectInstance.getPeriod();

            switch (period.getSchoolDays()){
                case MONDAY:
                    cost += 1;
                    break;
                case TUESDAY:
                    cost += 2;
                    break;
                case WEDNESDAY:
                    cost += 3;
                    break;
                case THURSDAY:
                    cost += 4;
                    break;
                case FRIDAY:
                    cost += 30; //TODO good cost change model + better data structure to avoid switch case
                    break;
                case SATURDAY:
                    cost += 100; //NOPE TODO implement +SATURDAY mode, default should be monday to friday
                    break;
            }

            if (period.getSchoolHour() + classSubjectInstance.getDuration() - 1 > 6) {
                cost += (period.getSchoolHour() + classSubjectInstance.getDuration() - 1 - 5) * 10;
            }

            if (classSubjectInstance.getClassSubject() != null && classSubjectInstance.getClassSubject().isBetterDoublePeriod() &&  classSubjectInstance.getDuration() == 1) {
                cost += 30; //TODO handle required double period check when creating random timetable
            }
        }
        return cost;
    }

    public void chooseRandomNeighborFunction(final int index1, final int index2) { //TODO add random function to change isntance duration, maybe split? isntance in multiple or another random generator
        final Random random = new Random();
        final int ranNumber = random.nextInt(1, 2);
        switch(ranNumber) {
            case 1:
              changePeriod(index1);
              //swapPeriods(index1, index2);
              break;
            case 2:
              changePeriod(index1);
              break;
        }
    }

    public boolean acceptSolution(final int costCurrTimeTable, final int costNextTimeTable) {
        final int deltaCost = costNextTimeTable - costCurrTimeTable;

        if (deltaCost < 0) { //next solution is better, always accept
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
