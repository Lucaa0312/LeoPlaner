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

export type TeacherFormStep = 1 | 2 | 3;
 
export type TimeSlot = {
    day: number; 
    time: string;
};

export type TeacherFormState = {
    firstName: string;
    lastName: string;
    nameSymbol: string;
    email: string;
    selectedSubjects: Subject[];

    nonWorkingHours: TimeSlot[];
    nonPreferredHours: TimeSlot[];
};