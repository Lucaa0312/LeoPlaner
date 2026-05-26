import { getJson } from "../utils/apiHelpers.js";
import type { ClassSubject } from "../types/classSubject.js";
import type { SchoolClass } from "../types/schoolClass.js";

export function fetchClassSubjects(): Promise<ClassSubject[]> {
  return getJson<ClassSubject[]>("/classSubjects");
}

export function fetchSchoolClasses(): Promise<SchoolClass[]> {
  return getJson<SchoolClass[]>("/getAllClasses");
}
