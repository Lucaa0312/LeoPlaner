import { getJson, postJson, putJson } from "../utils/apiHelpers.js";
import type {CreateSubjectRequest, Subject } from "../types/subject.js";

export function fetchSubjects(): Promise<Subject[]> {
    return getJson<Subject[]>("/subjects");
}

export function createSubject(subject: CreateSubjectRequest): Promise<void> {
    return postJson<CreateSubjectRequest>("/subjects", subject);
}

export function updateSubject(subjectId: number, subject: CreateSubjectRequest): Promise<void> {
    return putJson<CreateSubjectRequest>(`/subjects/update/${subjectId}`, subject);
}

