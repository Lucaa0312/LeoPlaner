export interface Room {
  id?: number;
}

export interface ClassSubject {
  id?: number;
}

export interface Timetable {
  id?: number;
}

export type SchoolClass = {
  id: number;
  className: string;
  classRoom: Room | null;
  classSubjects: ClassSubject[] | null;
  timetable: Timetable | null;
}
