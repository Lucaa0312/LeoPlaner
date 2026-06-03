import { getJson, postJson, putJson } from "../utils/apiHelpers.js";
export function fetchTeachers() {
    return getJson("/teachers/withWishes");
}
export function createTeacher(teacher) {
    return postJson("/teachers", teacher);
}
export function updateTeacher(teacherId, teacher) {
    return putJson(`/teachers/update/${teacherId}`, teacher);
}
