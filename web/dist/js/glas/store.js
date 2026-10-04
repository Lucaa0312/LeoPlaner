// One place that loads the master data for the Glas pages. Every request runs at most once per
// page load (the shell, the checks and the page share it); invalidate() after a change.
import { API_BASE_URL } from "../utils/apiBase.js";
export class HttpError extends Error {
    status;
    constructor(status, path) {
        super(`${path}: ${status}`);
        this.status = status;
    }
}
export async function getJson(path) {
    const r = await fetch(`${API_BASE_URL}${path}`);
    if (!r.ok)
        throw new HttpError(r.status, path);
    return (await r.json());
}
/** POST/PUT/DELETE with an optional JSON body; throws HttpError on a non-2xx answer */
export async function send(method, path, body) {
    const init = { method };
    if (body !== undefined) {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(body);
    }
    const r = await fetch(`${API_BASE_URL}${path}`, init);
    if (!r.ok)
        throw new HttpError(r.status, path);
    return r;
}
const PATHS = {
    teachers: "/teachers/withWishes",
    subjects: "/subjects",
    rooms: "/rooms",
    classes: "/getAllClasses",
    classSubjects: "/classSubjects",
};
const cache = new Map();
function memo(key, load) {
    let p = cache.get(key);
    if (!p) {
        p = load();
        cache.set(key, p);
        p.catch(() => cache.delete(key)); // a failed load may be retried
    }
    return p;
}
export const store = {
    teachers: () => memo("teachers", () => getJson(PATHS.teachers)),
    subjects: () => memo("subjects", () => getJson(PATHS.subjects)),
    rooms: () => memo("rooms", () => getJson(PATHS.rooms)),
    classes: () => memo("classes", () => getJson(PATHS.classes)),
    classSubjects: () => memo("classSubjects", () => getJson(PATHS.classSubjects)),
    all: async () => {
        const [teachers, subjects, rooms, classes, classSubjects] = await Promise.all([
            store.teachers(), store.subjects(), store.rooms(), store.classes(), store.classSubjects(),
        ]);
        return { teachers, subjects, rooms, classes, classSubjects };
    },
    features: () => memo("features", () => getJson("/admin/features").catch(() => ({ resetEnabled: false, demoDataEnabled: false }))),
    isRunning: () => memo("running", () => getJson("/isAlgorithmRunning")),
    hasRunBefore: () => memo("ranBefore", () => getJson("/isAlgorithmRunningAtLeastOnce")),
    /** forget cached answers, e.g. after a save or an import; no keys = everything */
    invalidate: (...keys) => {
        if (!keys.length)
            cache.clear();
        for (const k of keys)
            cache.delete(k);
    },
};
// ---------- small shared helpers ----------
export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
export const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr"];
/** hours 1-10 are the day school; the evening school (11-16) has no fixed times here */
export const HOUR_TIMES = {
    1: ["08:00", "08:50"], 2: ["08:55", "09:45"], 3: ["10:00", "10:50"], 4: ["10:55", "11:45"], 5: ["11:50", "12:40"],
    6: ["12:45", "13:35"], 7: ["13:40", "14:30"], 8: ["14:35", "15:25"], 9: ["15:30", "16:20"], 10: ["16:25", "17:15"],
};
export const DAY_HOURS = 10;
/** evening classes (Abendschule) use hours 11-16, see GpuImporter.EVENING_CLASS */
export const isEvening = (className) => /^(\d+A[BC]IFT?|1AVIF)$/i.test(className);
/** how many hours a class's week can hold */
export const classCapacity = (className) => DAYS.length * (isEvening(className) ? 6 : DAY_HOURS);
/** slots a teacher can be planned in (day school), after their "kann nicht" hours */
export function teacherFreeSlots(t) {
    const blocked = new Set(t.teacherNonWorkingHours.filter((s) => s.schoolHour >= 1 && s.schoolHour <= DAY_HOURS).map((s) => `${s.day}${s.schoolHour}`));
    return DAYS.length * DAY_HOURS - blocked.size;
}
/** weekly hours each teacher is assigned through the class subjects */
export function teacherLoad(classSubjects) {
    const m = new Map();
    for (const cs of classSubjects)
        for (const t of cs.teacher)
            m.set(t.id, (m.get(t.id) ?? 0) + cs.weeklyHours);
    return m;
}
/** weekly hours per class name */
export function classHours(classSubjects) {
    const m = new Map();
    for (const cs of classSubjects)
        m.set(cs.className, (m.get(cs.className) ?? 0) + cs.weeklyHours);
    return m;
}
export const ROOM_TYPES = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
export const ROOM_TYPE_LABEL = {
    CLASSROOM: "Klassenraum", EDV: "EDV-Saal", CHEM: "Chemiesaal", PHY: "Physiksaal", SPORT: "Turnsaal", WORKSHOP: "Werkstätte",
};
export const rgb = (c) => c ? `rgb(${c.red},${c.green},${c.blue})` : "rgb(150,156,170)";
/** reads ?key= from the URL */
export const param = (key) => new URLSearchParams(location.search).get(key);
