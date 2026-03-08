import type { Subject } from "./subject.js";

export type Teacher = {
    teacherName: string;
    nameSymbol: string;
    teachingSubject: Subject[];
};

export type CreateTeacherRequest = {
    teacherName: string;
    nameSymbol: string;
    teachingSubject: number[];
};
