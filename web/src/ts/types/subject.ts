import type { RoomType } from "./room.js";

export type SubjectColor = {
    red: number;
    green: number;
    blue: number;
};

export type Subject = {
    id: number;
    subjectName: string;
    subjectSymbol: string;
    subjectColor: SubjectColor;
    requiredRoomTypes: RoomType[];
};

export type CreateSubjectRequest = {
    subjectName: string;
    subjectSymbol: string;
    requiredRoomTypes: RoomType[];
    subjectColor: SubjectColor;
};
