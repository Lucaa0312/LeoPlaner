package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

public class Timetable {
    private ArrayList<ClassSubjectInstance> classSubjectInstances;

    public Timetable(ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public void initializeArrayWithTotalWeeklyHours() {

    }

    public ArrayList<ClassSubjectInstance> getClassSubjectInstances() {
        return classSubjectInstances;
    }

    public void setClassSubjectInstances(ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public void createRandomTimeTable() {

    }
}
