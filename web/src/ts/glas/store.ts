// One place that loads the master data for the Glas pages. Every request runs at most once per
// page load (the shell, the checks and the page share it); invalidate() after a change.
import { API_BASE_URL } from "../utils/apiBase.js";
import type { Room, RoomType } from "../types/room.js";
import type { Subject, SubjectColor } from "../types/subject.js";
import type { TimeSlot } from "../types/teacher.js";

export type { Room, RoomType, Subject, SubjectColor, TimeSlot };

export type Teacher = {
  id: number;
  teacherName: string;
  nameSymbol: string;
  teachingSubject: Subject[];
  teacherNonWorkingHours: TimeSlot[];
  teacherNonPreferredHours: TimeSlot[];
  wishText?: string | null;
};
export type ClassInfo = { id: number; className: string; roomDTO: Room | null };
export type TeacherLink = { id: number; teacherName: string; nameSymbol: string };
export type SubjectLink = { id: number; subjectName: string; subjectSymbol: string; subjectColor: SubjectColor | null };
export type ClassSubject = {
  weeklyHours: number;
  requiresDoublePeriod: boolean;
  isBetterDoublePeriod: boolean;
  className: string;
  /** the same key on several classes means one lesson taught to all of them together */
  couplingKey: string | null;
  teacher: TeacherLink[];
  subject: SubjectLink | null;
};
export type Features = { resetEnabled: boolean; demoDataEnabled: boolean };

export type Data = {
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  classes: ClassInfo[];
  classSubjects: ClassSubject[];
};

export class HttpError extends Error {
  constructor(public status: number, path: string) { super(`${path}: ${status}`); }
}

export async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE_URL}${path}`);
  if (!r.ok) throw new HttpError(r.status, path);
  return (await r.json()) as T;
}

/** POST/PUT/DELETE with an optional JSON body; throws HttpError on a non-2xx answer */
export async function send(method: "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<Response> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const r = await fetch(`${API_BASE_URL}${path}`, init);
  if (!r.ok) throw new HttpError(r.status, path);
  return r;
}

const PATHS = {
  teachers: "/teachers/withWishes",
  subjects: "/subjects",
  rooms: "/rooms",
  classes: "/getAllClasses",
  classSubjects: "/classSubjects",
} as const;
type Key = keyof typeof PATHS;

const cache = new Map<string, Promise<unknown>>();
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load();
    cache.set(key, p);
    p.catch(() => cache.delete(key)); // a failed load may be retried
  }
  return p;
}

export const store = {
  teachers: () => memo("teachers", () => getJson<Teacher[]>(PATHS.teachers)),
  subjects: () => memo("subjects", () => getJson<Subject[]>(PATHS.subjects)),
  rooms: () => memo("rooms", () => getJson<Room[]>(PATHS.rooms)),
  classes: () => memo("classes", () => getJson<ClassInfo[]>(PATHS.classes)),
  classSubjects: () => memo("classSubjects", () => getJson<ClassSubject[]>(PATHS.classSubjects)),
  all: async (): Promise<Data> => {
    const [teachers, subjects, rooms, classes, classSubjects] = await Promise.all([
      store.teachers(), store.subjects(), store.rooms(), store.classes(), store.classSubjects(),
    ]);
    return { teachers, subjects, rooms, classes, classSubjects };
  },
  features: () => memo("features", () => getJson<Features>("/admin/features").catch(() => ({ resetEnabled: false, demoDataEnabled: false }))),
  isRunning: () => memo("running", () => getJson<boolean>("/isAlgorithmRunning")),
  hasRunBefore: () => memo("ranBefore", () => getJson<boolean>("/isAlgorithmRunningAtLeastOnce")),
  /** forget cached answers, e.g. after a save or an import; no keys = everything */
  invalidate: (...keys: (Key | "features" | "running" | "ranBefore")[]): void => {
    if (!keys.length) cache.clear();
    for (const k of keys) cache.delete(k);
  },
};

// ---------- small shared helpers ----------
export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr"];
/** hours 1-10 are the day school; the evening school (11-16) has no fixed times here */
export const HOUR_TIMES: Record<number, [string, string]> = {
  1: ["08:00", "08:50"], 2: ["08:55", "09:45"], 3: ["10:00", "10:50"], 4: ["10:55", "11:45"], 5: ["11:50", "12:40"],
  6: ["12:45", "13:35"], 7: ["13:40", "14:30"], 8: ["14:35", "15:25"], 9: ["15:30", "16:20"], 10: ["16:25", "17:15"],
};
export const DAY_HOURS = 10;

/** evening classes (Abendschule) use hours 11-16, see GpuImporter.EVENING_CLASS */
export const isEvening = (className: string): boolean => /^(\d+A[BC]IFT?|1AVIF)$/i.test(className);
/** how many hours a class's week can hold */
export const classCapacity = (className: string): number => DAYS.length * (isEvening(className) ? 6 : DAY_HOURS);

/** hours of the day a class is taught in: 1-10, or 11-16 for the evening school */
const classWindow = (className: string): number[] =>
  isEvening(className) ? [11, 12, 13, 14, 15, 16] : Array.from({ length: DAY_HOURS }, (_, i) => i + 1);

/**
 * slots a teacher can be planned in, after their "kann nicht" hours. Counted over the hours of the
 * classes they teach (day and/or evening school), like the import's feasibility check does.
 */
export function teacherFreeSlots(t: Teacher, classSubjects: ClassSubject[]): number {
  const window = new Set<number>();
  for (const cs of classSubjects) if (cs.teacher.some((x) => x.id === t.id)) classWindow(cs.className).forEach((h) => window.add(h));
  if (!window.size) classWindow("").forEach((h) => window.add(h));
  const blocked = new Set(t.teacherNonWorkingHours.filter((s) => window.has(s.schoolHour)).map((s) => `${s.day}${s.schoolHour}`));
  return DAYS.length * window.size - blocked.size;
}

/** weekly hours each teacher is assigned; a lesson coupled across several classes counts once */
export function teacherLoad(classSubjects: ClassSubject[]): Map<number, number> {
  const m = new Map<number, number>();
  const seen = new Set<string>();
  for (const cs of classSubjects) {
    for (const t of cs.teacher) {
      if (cs.couplingKey) {
        const k = `${t.id}|${cs.couplingKey}`;
        if (seen.has(k)) continue;
        seen.add(k);
      }
      m.set(t.id, (m.get(t.id) ?? 0) + cs.weeklyHours);
    }
  }
  return m;
}

/** weekly hours per class name */
export function classHours(classSubjects: ClassSubject[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const cs of classSubjects) m.set(cs.className, (m.get(cs.className) ?? 0) + cs.weeklyHours);
  return m;
}

export const ROOM_TYPES: RoomType[] = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
export const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  CLASSROOM: "Klassenraum", EDV: "EDV-Saal", CHEM: "Chemiesaal", PHY: "Physiksaal", SPORT: "Turnsaal", WORKSHOP: "Werkstätte",
};

export const rgb = (c: SubjectColor | null | undefined): string => c ? `rgb(${c.red},${c.green},${c.blue})` : "rgb(150,156,170)";

/** reads ?key= from the URL */
export const param = (key: string): string | null => new URLSearchParams(location.search).get(key);
