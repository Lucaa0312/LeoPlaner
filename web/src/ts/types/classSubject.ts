import type { Teacher } from "./teacher.js";
import type { Subject } from "./subject.js";

export type ClassSubject = {
  id?: number;
  teacher: Teacher[];
  subject: Subject;
  weeklyHours: number;
  requiresDoublePeriod: boolean;
  isBetterDoublePeriod: boolean;
  className: string;
};

export type GroupedClass = {
    className: string;
    weeklyHours: number;
    subjectCount: number;
    subjects: ClassSubject[];
};