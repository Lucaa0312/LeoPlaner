package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class Timetable {
    private ArrayList<ClassSubjectInstance> classSubjectInstances;
    private int totalWeeklyHours;

    public Timetable(final ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public void calculateWeeklyHours() {
      int totalHours = 0;
      List<String> classSubjectsUsed = new ArrayList<>();

      for (ClassSubjectInstance instance : classSubjectInstances) {
          ClassSubject classSubject = instance.getClassSubject();

          if (!classSubjectsUsed.contains(classSubject.getId().toString())) {
              totalHours += classSubject.getWeeklyHours();
              classSubjectsUsed.add(classSubject.getId().toString());
          }
      }
      setTotalWeeklyHours(totalHours);
    }

    public boolean checkIfPeriodIsTaken(Period period) {
        for (ClassSubjectInstance csi : classSubjectInstances) {
            if (csi.getPeriod().getSchoolDays() == period.getSchoolDays() && csi.getPeriod().getSchoolHour() == period.getSchoolHour()) {
                return true;
            }
        }
        return false;
    }

    public ArrayList<ClassSubjectInstance> cloneClassSubjectInstanceList() {
        ArrayList<ClassSubjectInstance> clonedClassSubjectInstances = new ArrayList<>();
        for (ClassSubjectInstance csi : this.classSubjectInstances) {
            clonedClassSubjectInstances.add(csi);
        }
        return clonedClassSubjectInstances;
    }

    public Timetable cloneCurrentTimeTable() {
        return new Timetable(cloneClassSubjectInstanceList());
    }

    public Timetable giveClassSubjectRandomPeriodAndReturn(int index) {
        Random random = new Random();
        Period period;
        do {
            SchoolDays ranSchoolDay = SchoolDays.values()[random.nextInt(0, SchoolDays.values().length)];
            int randSchoolHour = random.nextInt(1, 7);
            period = new Period(ranSchoolDay, randSchoolHour);

        } while (checkIfPeriodIsTaken(period));

        return switchClassSubjectInstancePeriodAndReturn(index,period);
  }

    public Timetable switchClassSubjectInstancePeriodAndReturn(int index, Period newPeriod) {
      Timetable clonedTimetable = this.cloneCurrentTimeTable();
      ClassSubjectInstance csi = clonedTimetable.getClassSubjectInstances().get(index);
      csi.setPeriod(newPeriod);
      return clonedTimetable;
  }

    public Timetable switchTwoClassSubjectInstancesAndReturn(int index1, int index2) {
        Timetable clonedTimetable = this.cloneCurrentTimeTable();
        ClassSubjectInstance csi1 = clonedTimetable.getClassSubjectInstances().get(index1);
        ClassSubjectInstance csi2 = clonedTimetable.getClassSubjectInstances().get(index2);

        Period tempPeriod = csi2.getPeriod();
        csi2.setPeriod(csi1.getPeriod());
        csi1.setPeriod(tempPeriod);

        return clonedTimetable;
    }
 

    public ArrayList<ClassSubjectInstance> getClassSubjectInstances() {
        return classSubjectInstances;
    }

    public void setClassSubjectInstances(final ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }


    public int getTotalWeeklyHours() {
      return this.totalWeeklyHours;
    }


    public void setTotalWeeklyHours(final int totalWeeklyHours) {
      this.totalWeeklyHours = totalWeeklyHours;
    }

}
