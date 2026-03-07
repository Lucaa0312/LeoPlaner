import { getJson, postJson } from "../utils/apiHelpers.js";
import type {CreateSubjectRequest, Subject } from "../types/subject.js";

export function fetchSubjects(): Promise<Subject[]> {
    return getJson<Subject[]>("/subjects");
}

export function createSubject(subject: CreateSubjectRequest): Promise<void> {
    return postJson<CreateSubjectRequest>("/subjects", subject);
}
