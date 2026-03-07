import { getJson, postJson } from "../utils/apiHelpers.js";
export function fetchSubjects() {
    return getJson("/subjects");
}
export function createSubject(subject) {
    return postJson("/subjects", subject);
}
