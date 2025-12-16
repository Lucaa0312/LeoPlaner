package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class Timetable {
    private ArrayList<ClassSubjectInstance> classSubjectInstances;
    private int totalWeeklyHours; //all durations summed up

    public Timetable(final ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public void calculateWeeklyHours() {  //TODO free lunch periods not included yet
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

    public ArrayList<ClassSubjectInstance> cloneClassSubjectInstanceList() { //deep deep copy since all lives on the heap
        ArrayList<ClassSubjectInstance> clonedClassSubjectInstances = new ArrayList<>();
        for (ClassSubjectInstance csi : this.classSubjectInstances) {
            Period clonedPeriod = new Period(csi.getPeriod().getSchoolDays(), csi.getPeriod().getSchoolHour());
            ClassSubjectInstance clonedCsi = new ClassSubjectInstance(csi.getClassSubject(), clonedPeriod, csi.getRoom(), csi.getDuration());
            clonedClassSubjectInstances.add(clonedCsi);
        }
        return clonedClassSubjectInstances;
    }

    public void implementRandomLunchBreakOnDay(SchoolDays schoolday) {
        int classesAmountOnDay = classSubjectInstances.stream().filter(e -> e.getPeriod().getSchoolDays() == schoolday).mapToInt(e -> e.getDuration()).sum(); //sum of all durations on certain day

        Random random = new Random();
        int randSchoolHour = random.nextInt(1, classesAmountOnDay);
        System.out.println(randSchoolHour);

        final boolean LUNCHBREAK = true;
        Period lunchBreakPeriod = new Period(schoolday, randSchoolHour, LUNCHBREAK);

        this.classSubjectInstances.stream().filter(e -> e.getPeriod().getSchoolDays() == schoolday && e.getPeriod().getSchoolHour() >= randSchoolHour)
                        .forEach(e -> e.getPeriod().setSchoolHour(e.getPeriod().getSchoolHour() + 1)); // move each class after lunch break one hour later

        this.classSubjectInstances.add(new ClassSubjectInstance(null, lunchBreakPeriod, null, 1)); //place holder fake csi for lunch break
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
