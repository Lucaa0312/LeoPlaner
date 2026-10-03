import { getJson } from "../utils/apiHelpers.js";
export async function fetchTimetableByClass(classId) {
    const data = await getJson(`/timetable/getByClass/${classId}`);
    if (data.classSubjectInstances) {
        return data.classSubjectInstances;
    }
    return [];
}
export async function fetchTimetableByTeacher(teacherId) {
    const data = await getJson(`/timetable/getByTeacher/${teacherId}`);
    if (data.timetableDTO && data.timetableDTO.classSubjectInstances) {
        return data.timetableDTO.classSubjectInstances;
    }
    return [];
}
export async function fetchTimetableByRoom(roomId) {
    const data = await getJson(`/timetable/getByRoom/${roomId}`);
    if (data.classSubjectInstances) {
        return data.classSubjectInstances;
    }
    return [];
}
