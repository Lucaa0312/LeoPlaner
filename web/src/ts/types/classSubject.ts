import type { SubjectColor } from "./subject.js";

// Answer of GET /api/classSubjects. The backend sends no id, so a class-subject
// cannot be addressed for editing or deleting.
export type ClassSubject = {
  teacher: { id: number; teacherName: string; nameSymbol: string }[];
  subject: { id: number; subjectName: string; subjectSymbol: string; subjectColor: SubjectColor | null };
  weeklyHours: number;
  requiresDoublePeriod: boolean;
  isBetterDoublePeriod: boolean;
  className: string;
};

// Body of POST /api/classSubjects (the JPA entity). Jackson maps the setter
// setBetterDoublePeriod, so the field is called betterDoublePeriod here.
export type CreateClassSubjectRequest = {
  subject: { id: number };
  teachers: { id: number }[];
  schoolClass: { id: number };
  weeklyHours: number;
  requiresDoublePeriod: boolean;
  betterDoublePeriod: boolean;
};
