import type { Subject } from "./subject.js";

export type Teacher = {
  id: number;
  teacherName: string;
  nameSymbol: string;
  teachingSubject: Subject[];
  teacherNonWorkingHours: TimeSlot[];
  teacherNonPreferredHours: TimeSlot[];
};

export type CreateTeacherRequest = {
  teacherName: string;
  nameSymbol: string;
  teachingSubject: { id: number }[];
  teacher_non_working_hours: TimeSlot[];
  teacher_non_preferred_hours: TimeSlot[];
};

export type TeacherFormStep = 1 | 2 | 3;

export type TimeSlot = {
  day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";
  schoolHour: number;
};

export type TeacherFormState = {
  firstName: string;
  lastName: string;
  nameSymbol: string;
  email: string;
  selectedSubjects: Subject[];

  nonWorkingHours: TimeSlot[];
  nonPreferredHours: TimeSlot[];
};
