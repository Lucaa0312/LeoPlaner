package at.htlleonding.leoplaner.data;

import java.util.ArrayList;
import java.util.List;

public class Timetable {
    private ArrayList<ClassSubjectInstance> classSubjectInstances;
    private int totalWeeklyHours;

    public Timetable(final ArrayList<ClassSubjectInstance> classSubjectInstances) {
        this.classSubjectInstances = classSubjectInstances;
    }

    public void calulateWeeklyHours() {
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
