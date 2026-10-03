import { getJson, postJson } from "../utils/apiHelpers.js";
export function fetchClassSubjects() {
    return getJson("/classSubjects");
}
export function fetchSchoolClasses() {
    return getJson("/getAllClasses");
}
export function createClassSubject(classSubject) {
    return postJson("/classSubjects", classSubject);
}
