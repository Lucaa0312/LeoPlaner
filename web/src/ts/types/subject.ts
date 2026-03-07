import type { RoomType } from "./room.js";

export type SubjectColor = {
    red: number;
    green: number;
    blue: number;
};

export type Subject = {
    subjectName: string;
    subjectColor: SubjectColor;
    requiredRoomTypes: RoomType[];
};

export type CreateSubjectRequest = {
    subjectName: string;
    requiredRoomTypes: RoomType[];
    subjectColor: SubjectColor;
};