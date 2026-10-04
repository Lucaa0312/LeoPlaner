// The finished timetable as one list of lessons, built from the class plans. Teacher and room
// plans are derived from the same list, so every view shows exactly the same lessons.
import { DAYS, getJson, HttpError, type ClassInfo, type SubjectColor } from "./store.js";

type InstanceDTO = {
  duration: number;
  room: { id: number; roomNumber: number; roomName: string; nameShort: string } | null;
  period: { schoolDays: string; schoolHour: number; lunchBreak: boolean };
  classSubject: {
    className: string;
    teacher: { id: number; teacherName: string; nameSymbol: string }[];
    subject: { id: number; subjectName: string; subjectSymbol: string; subjectColor: SubjectColor | null } | null;
  } | null;
};
type TimetableDTO = { weeklyHours: number; classSubjectInstances: InstanceDTO[]; cost: number; temperature: number };

export type Lesson = {
  key: number;
  classId: number;
  cls: string;
  day: number;
  hour: number;
  len: number;
  subjectId: number | null;
  subject: string;
  subjectName: string;
  color: SubjectColor | null;
  teachers: { id: number; sym: string; name: string }[];
  roomId: number | null;
  room: string;
};

export type School = {
  lessons: Lesson[];
  /** cost reported with the class plans (all carry the cost of the whole plan) */
  cost: number | null;
  /** classes the server had no plan for yet */
  missing: string[];
  /** lowest and highest hour used anywhere, for one consistent grid while browsing */
  hourRange: [number, number];
};

export async function loadSchool(classes: ClassInfo[]): Promise<School> {
  const lessons: Lesson[] = [];
  const missing: string[] = [];
  let cost: number | null = null;
  let key = 0;
  const results = await Promise.all(classes.map((c) =>
    getJson<TimetableDTO>(`/timetable/getByClass/${c.id}`).then(
      (t) => ({ c, t }),
      (e: unknown) => { if (e instanceof HttpError && e.status === 404) return { c, t: null }; throw e; },
    )));
  for (const { c, t } of results) {
    if (!t) { missing.push(c.className); continue; }
    if (cost === null || t.cost > 0) cost = t.cost;
    for (const i of t.classSubjectInstances) {
      if (i.period.lunchBreak) continue; // the lunch break is a placeholder, not a lesson
      const day = DAYS.indexOf(i.period.schoolDays as (typeof DAYS)[number]);
      if (day < 0) continue;
      const s = i.classSubject?.subject ?? null;
      lessons.push({
        key: key++,
        classId: c.id,
        cls: i.classSubject?.className ?? c.className,
        day,
        hour: i.period.schoolHour,
        len: Math.max(1, i.duration || 1),
        subjectId: s?.id ?? null,
        subject: (s?.subjectSymbol ?? "?").toUpperCase(),
        subjectName: s?.subjectName ?? "Unbekanntes Fach",
        color: s?.subjectColor ?? null,
        teachers: (i.classSubject?.teacher ?? []).map((x) => ({ id: x.id, sym: x.nameSymbol.toUpperCase(), name: x.teacherName })),
        roomId: i.room?.id ?? null,
        room: i.room ? (i.room.nameShort || String(i.room.roomNumber)).toUpperCase() : "",
      });
    }
  }
  let lo = Infinity, hi = -Infinity;
  for (const l of lessons) { lo = Math.min(lo, l.hour); hi = Math.max(hi, l.hour + l.len - 1); }
  const hourRange: [number, number] = lessons.length ? [Math.min(lo, 1), Math.max(hi, 6)] : [1, 8];
  return { lessons, cost, missing, hourRange };
}

export type PlanStats = { hours: number; gaps: number; doubles: number; latest: number; days: number };

/** free periods = empty hours between the first and the last lesson of a day */
export function statsFor(ls: Lesson[]): PlanStats {
  let hours = 0, gaps = 0, doubles = 0, latest = 0;
  const byDay = new Map<number, Set<number>>();
  for (const l of ls) {
    hours += l.len;
    if (l.len > 1) doubles++;
    latest = Math.max(latest, l.hour + l.len - 1);
    const set = byDay.get(l.day) ?? new Set<number>();
    for (let h = l.hour; h < l.hour + l.len; h++) set.add(h);
    byDay.set(l.day, set);
  }
  for (const set of byDay.values()) {
    const hs = [...set];
    const a = Math.min(...hs), b = Math.max(...hs);
    gaps += b - a + 1 - set.size;
  }
  return { hours, gaps, doubles, latest, days: byDay.size };
}

// ---------- colour: tile ink by contrast (DESIGN.md, Contrast-Derived Tile Ink Rule) ----------
const lin = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (r: number, g: number, b: number): number => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** the subject's own hue, darkened until it reads at 4.5:1 on its 20 % tile tint */
export function tileInk(c: SubjectColor | null): string {
  const { red: r, green: g, blue: b } = c ?? { red: 120, green: 126, blue: 140 };
  const bg = lum(r * 0.2 + 255 * 0.8, g * 0.2 + 255 * 0.8, b * 0.2 + 255 * 0.8);
  for (let k = 0.7; k >= 0; k -= 0.05) {
    const x = [r * k, g * k, b * k] as const;
    if (contrast(lum(x[0], x[1], x[2]), bg) >= 4.5) return `rgb(${Math.round(x[0])},${Math.round(x[1])},${Math.round(x[2])})`;
  }
  return "#1d2029";
}
