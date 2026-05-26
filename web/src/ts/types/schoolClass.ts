import type { Room } from "./room.js";
import type { ClassSubject } from "./classSubject.js";

export interface Timetable {
  id?: number;
}

export type SchoolClass = {
  id: number;
  className: string;
  classRoom: Room | null;
  classSubjects: ClassSubject[] | null;
  timetable: Timetable | null;
};
