import { getJson, postJson } from "../utils/apiHelpers.js";
import type { CreateTeacherRequest, Teacher } from "../types/teacher.js";

export function fetchTeachers(): Promise<Teacher[]> {
    return getJson<Teacher[]>("/teachers");
}

export function createTeacher(teacher: CreateTeacherRequest): Promise<void> {
    return postJson<CreateTeacherRequest>("/teachers", teacher);
}