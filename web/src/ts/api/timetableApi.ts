import { getJson } from "../utils/apiHelpers.js";
import type { SubjectColor } from "../types/subject.js";

export type TimetableLesson = {
  classSubject?: {
    className?: string;
    subject?: { id: number; subjectName: string; subjectSymbol: string; subjectColor?: SubjectColor | null };
    teacher?: { id: number; teacherName: string; nameSymbol: string }[];
  };
  period: {
    schoolDays: string;
    schoolHour: number;
    lunchBreak: boolean;
  };
  duration?: number;
  room?: { id?: number; nameShort: string } | null;
};

type TimetableResponse = {
  classSubjectInstances: TimetableLesson[] | null;
};

type TeacherTimetableResponse = {
  timetableDTO: TimetableResponse | null;
};

export async function fetchTimetableByClass(classId: number): Promise<TimetableLesson[]> {
  const data = await getJson<TimetableResponse>(`/timetable/getByClass/${classId}`);
  if (data.classSubjectInstances) {
    return data.classSubjectInstances;
  }
  return [];
}

export async function fetchTimetableByTeacher(teacherId: number): Promise<TimetableLesson[]> {
  const data = await getJson<TeacherTimetableResponse>(`/timetable/getByTeacher/${teacherId}`);
  if (data.timetableDTO && data.timetableDTO.classSubjectInstances) {
    return data.timetableDTO.classSubjectInstances;
  }
  return [];
}

export async function fetchTimetableByRoom(roomId: number): Promise<TimetableLesson[]> {
  const data = await getJson<TimetableResponse>(`/timetable/getByRoom/${roomId}`);
  if (data.classSubjectInstances) {
    return data.classSubjectInstances;
  }
  return [];
}
