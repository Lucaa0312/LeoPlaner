package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Comparator;

public class Timetable {
    private ArrayList<ClassSubjectInstance> classSubjectInstances;
    private int totalWeeklyHours; //all durations summed up

    public Timetable(final ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public void sortTimetableBySchoolhour() {
        this.classSubjectInstances.sort(Comparator.comparingInt(e -> e.getPeriod().getSchoolHour()));
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
        final int HIGHEST_SCHOOLHOUR = classSubjectInstances.stream()
                                                              .filter(e -> e.getPeriod().getSchoolDays() == schoolday).mapToInt(e -> e.getPeriod().getSchoolHour())
                                                              .max().getAsInt(); //get highest Schoolhour
        final int LOWEST_SCHOOLHOUR = classSubjectInstances.stream().
                                                                filter(e -> e.getPeriod().getSchoolDays() == schoolday).mapToInt(e -> e.getPeriod().getSchoolHour())
                                                                .min().getAsInt(); //get lowest Schoolhour

        Random random = new Random();
        int randSchoolHour = random.nextInt(LOWEST_SCHOOLHOUR, HIGHEST_SCHOOLHOUR + 1);

        final boolean LUNCHBREAK = true;
        Period lunchBreakPeriod = new Period(schoolday, randSchoolHour, LUNCHBREAK);

        this.classSubjectInstances.stream().filter(e -> e.getPeriod().getSchoolDays() == schoolday && e.getPeriod().getSchoolHour() >= randSchoolHour)
                        .forEach(e -> e.getPeriod().setSchoolHour(e.getPeriod().getSchoolHour() + 1)); // move each class after lunch break one hour later

        this.classSubjectInstances.add(new ClassSubjectInstance(null, lunchBreakPeriod, null, 1)); //place holder fake csi for lunch break
    }

    public Timetable cloneCurrentTimeTable() {
        return new Timetable(cloneClassSubjectInstanceList());
    }


    public ArrayList<Period> returnAllFreePeriodsOnCertainDay(SchoolDays schoolDay, int duration) {
        ArrayList<Period> result = new ArrayList<>();
        List<ClassSubjectInstance> csisOnDay = this.classSubjectInstances.stream().filter(e -> e.getPeriod().getSchoolDays() == schoolDay).toList();

        final int FIRST_HOUR = 1;
        final int LAST_HOUR = 15;

        // latest possible start hour so duration fits
        for (int startHour = FIRST_HOUR; startHour <= LAST_HOUR - duration + 1; startHour++) {
            boolean isFree = true;

            // check agaainst ALL existing CSIs
            for (ClassSubjectInstance csi : csisOnDay) {
                int occupiedStart = csi.getPeriod().getSchoolHour();
                int occupiedEnd = occupiedStart + csi.getDuration() - 1;

                int candidateStart = startHour;
                int candidateEnd = startHour + duration - 1;

                // overlap check
                if (candidateStart <= occupiedEnd && candidateEnd >= occupiedStart) {
                    isFree = false;
                    break;
                }
            }

            if (isFree) {
                result.add(new Period(schoolDay, startHour));
            }
        }

        return result;
    }


    public Timetable giveClassSubjectRandomPeriodAndReturn(int index) {
        Random random = new Random();
        ArrayList<Period> allFreePeriods = new ArrayList<>();

        for (SchoolDays schoolDay : SchoolDays.values()) {
            allFreePeriods.addAll(returnAllFreePeriodsOnCertainDay(schoolDay, this.classSubjectInstances.get(index).getDuration()));
        }

        if (allFreePeriods.isEmpty()) {
            throw new RuntimeException("no Free Period avaible"); //TODO add a check for that in algorrithm class
        }

        return switchClassSubjectInstancePeriodAndReturn(index, allFreePeriods.get(random.nextInt(allFreePeriods.size())));
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
