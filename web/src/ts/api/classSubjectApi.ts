import { getJson, postJson } from "../utils/apiHelpers.js";
import type { ClassSubject, CreateClassSubjectRequest } from "../types/classSubject.js";
import type { SchoolClass } from "../types/schoolClass.js";

export function fetchClassSubjects(): Promise<ClassSubject[]> {
  return getJson<ClassSubject[]>("/classSubjects");
}

export function fetchSchoolClasses(): Promise<SchoolClass[]> {
  return getJson<SchoolClass[]>("/getAllClasses");
}

export function createClassSubject(classSubject: CreateClassSubjectRequest): Promise<void> {
  return postJson<CreateClassSubjectRequest>("/classSubjects", classSubject);
}
