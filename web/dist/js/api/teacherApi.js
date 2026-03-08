import { getJson, postJson } from "../utils/apiHelpers.js";
export function fetchTeachers() {
    return getJson("/teachers");
}
export function createTeacher(teacher) {
    return postJson("/teachers", teacher);
}
