import type { Subject } from "./subject.js";
import type { SchoolDay } from "../utils/periods.js";

export type TimeSlot = {
  day: SchoolDay;
  schoolHour: number;
};

// Answer of GET /api/teachers/withWishes
export type Teacher = {
  id: number;
  teacherName: string;
  nameSymbol: string;
  teachingSubject: Subject[];
  teacherNonWorkingHours: TimeSlot[];
  teacherNonPreferredHours: TimeSlot[];
  wishText: string | null;
};

// Body of POST /api/teachers and PUT /api/teachers/update/{id}.
// The update overwrites every field, so the availability and the wish text are always sent along.
export type CreateTeacherRequest = {
  teacherName: string;
  nameSymbol: string;
  teachingSubject: { id: number }[];
  teacher_non_working_hours: TimeSlot[];
  teacher_non_preferred_hours: TimeSlot[];
  wishText: string | null;
};
