import { getJson, postJson, putJson } from "../utils/apiHelpers.js";
export function fetchSubjects() {
    return getJson("/subjects");
}
export function createSubject(subject) {
    return postJson("/subjects", subject);
}
export function updateSubject(subjectId, subject) {
    return putJson(`/subjects/update/${subjectId}`, subject);
}
