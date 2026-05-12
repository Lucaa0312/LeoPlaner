import { getJson } from "../utils/apiHelpers.js";
import type { ClassSubject } from "../types/classSubject.js";

export function fetchClassSubjects(): Promise<ClassSubject[]> {
    return getJson<ClassSubject[]>("/classSubjects");
}
