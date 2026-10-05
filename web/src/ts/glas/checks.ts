// The pre-run check (2 Prüfung), computed in the browser from the master data.
// The backend has no validation endpoint yet (BACKEND_TODO #2), so these are the rules we can see
// from the data: everything the import does not catch and the run would stumble over.
import { classCapacity, classHours, isEvening, ROOM_TYPE_LABEL, teacherFreeSlots, teacherLoad, type Data } from "./store.js";
import { code, title } from "./ui.js";

/** error = the run will not produce a usable plan; warn = it runs, but the result suffers */
export type Severity = "error" | "warn";
export type EntityKind = "lehrer" | "klasse" | "fach" | "raum";
export type Finding = {
  sev: Severity;
  kind: EntityKind;
  /** id used for the link to the data page */
  id: number;
  /** short badge, e.g. "4CHITM" or "JF" */
  tag: string;
  text: string;
  /** groups findings on the Prüfung page */
  rule: string;
};

export const RULES: Record<string, { label: string; why: string }> = {
  noTeacher: { label: "Unterricht ohne Lehrkraft", why: "Ohne Lehrkraft kann diese Stunde nicht sinnvoll geplant werden." },
  classOver: { label: "Klasse hat mehr Stunden als die Woche", why: "Mehr Wochenstunden, als die Woche Einheiten hat. Diese Stunden lassen sich nicht unterbringen." },
  teacherOver: { label: "Lehrkraft hat zu wenig freie Einheiten", why: "Mehr zugeteilte Stunden als Einheiten, in denen die Lehrkraft kann. Es wird zwangsläufig Überschneidungen geben." },
  teacherSubject: { label: "Lehrkraft hat das Fach nicht eingetragen", why: "Die Lehrkraft unterrichtet ein Fach, das im Lehrerprofil nicht als Unterrichtsfach steht. Oft ein Tippfehler beim Import." },
  noHomeRoom: { label: "Klasse ohne Stammraum", why: "Unterricht findet im Stammraum statt. Ohne Stammraum steht im fertigen Plan kein Raum." },
  doubleOnOne: { label: "Doppelstunde bei nur einer Wochenstunde", why: "Eine Doppelstunde braucht mindestens zwei Wochenstunden." },
  roomTypeMissing: { label: "Kein Raum mit dem verlangten Raumtyp", why: "Das Fach verlangt einen Raumtyp, den kein Raum hat. Raumtypen fließen derzeit nur als Information ein." },
  roomNoType: { label: "Raum ohne Raumtyp", why: "Ein Raum ohne Typ wird für kein Fach mit Raumwunsch in Frage kommen." },
};

export function runChecks(d: Data): Finding[] {
  const out: Finding[] = [];
  const classByName = new Map(d.classes.map((c) => [c.className, c]));
  const teacherById = new Map(d.teachers.map((t) => [t.id, t]));
  const subjectById = new Map(d.subjects.map((s) => [s.id, s]));
  const classId = (name: string): number => classByName.get(name)?.id ?? 0;

  // class subjects: missing teacher, double period on one hour, teacher without the subject
  const mismatch = new Map<number, Map<string, string[]>>(); // teacher -> subject code -> classes
  const doubles = new Map<string, string[]>(); // class -> subjects
  for (const cs of d.classSubjects) {
    const subj = cs.subject ? title(cs.subject.subjectName) : "Ein Fach";
    if (!cs.teacher.length) {
      out.push({ sev: "error", kind: "klasse", id: classId(cs.className), tag: code(cs.className), text: `${subj} hat keine Lehrkraft`, rule: "noTeacher" });
    }
    if (cs.requiresDoublePeriod && cs.weeklyHours < 2) {
      doubles.set(cs.className, [...(doubles.get(cs.className) ?? []), cs.subject ? code(cs.subject.subjectSymbol) : subj]);
    }
    if (!cs.subject) continue;
    for (const link of cs.teacher) {
      const t = teacherById.get(link.id);
      if (!t || t.teachingSubject.some((s) => s.id === cs.subject!.id)) continue;
      const bySubject = mismatch.get(t.id) ?? new Map<string, string[]>();
      const sym = code(cs.subject.subjectSymbol);
      bySubject.set(sym, [...(bySubject.get(sym) ?? []), code(cs.className)]);
      mismatch.set(t.id, bySubject);
    }
  }
  for (const [tid, bySubject] of mismatch) {
    const t = teacherById.get(tid)!;
    const list = [...bySubject].map(([sym, cls]) => `${sym} (${cls.join(", ")})`).join(", ");
    out.push({ sev: "warn", kind: "lehrer", id: t.id, tag: code(t.nameSymbol), text: `unterrichtet ohne eingetragenes Unterrichtsfach: ${list}`, rule: "teacherSubject" });
  }
  for (const [cls, subjects] of doubles) {
    out.push({ sev: "warn", kind: "klasse", id: classId(cls), tag: code(cls), text: `Doppelstunde verlangt bei nur 1 Wochenstunde: ${subjects.join(", ")}`, rule: "doubleOnOne" });
  }

  // capacity: classes and teachers
  for (const [name, hours] of classHours(d.classSubjects)) {
    const cap = classCapacity(name);
    if (hours > cap) out.push({ sev: "error", kind: "klasse", id: classId(name), tag: code(name), text: `${hours} Wochenstunden, die Woche hat nur ${cap} Einheiten${isEvening(name) ? " (Abendschule)" : ""}`, rule: "classOver" });
  }
  const load = teacherLoad(d.classSubjects);
  for (const t of d.teachers) {
    const hours = load.get(t.id) ?? 0, free = teacherFreeSlots(t, d.classSubjects);
    if (hours > free) out.push({ sev: "error", kind: "lehrer", id: t.id, tag: code(t.nameSymbol), text: `${hours} Stunden zugeteilt, nur ${free} Einheiten frei`, rule: "teacherOver" });
  }

  // rooms
  for (const c of d.classes) {
    if (!c.roomDTO) out.push({ sev: "warn", kind: "klasse", id: c.id, tag: code(c.className), text: "hat keinen Stammraum", rule: "noHomeRoom" });
  }
  const typesInUse = new Set(d.rooms.flatMap((r) => r.roomTypes));
  const usedSubjects = new Set(d.classSubjects.map((cs) => cs.subject?.id));
  for (const s of d.subjects) {
    if (!usedSubjects.has(s.id)) continue;
    const missing = s.requiredRoomTypes.filter((t) => !typesInUse.has(t));
    if (missing.length) out.push({ sev: "warn", kind: "fach", id: s.id, tag: code(s.subjectSymbol), text: `verlangt ${missing.map((t) => ROOM_TYPE_LABEL[t]).join(", ")}, kein Raum hat diesen Typ`, rule: "roomTypeMissing" });
  }
  for (const r of d.rooms) {
    if (!r.roomTypes.length) out.push({ sev: "warn", kind: "raum", id: r.id, tag: code(r.nameShort || String(r.roomNumber)), text: "hat keinen Raumtyp", rule: "roomNoType" });
  }

  // errors first, then by rule order, then by tag
  const order = Object.keys(RULES);
  return out.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === "error" ? -1 : 1) || order.indexOf(a.rule) - order.indexOf(b.rule) || a.tag.localeCompare(b.tag, "de"));
}

export const ENTITY_PAGE: Record<EntityKind, string> = { lehrer: "./lehrer.html", klasse: "./klassen.html", fach: "./faecher.html", raum: "./raeume.html" };
export const ENTITY_WORD: Record<EntityKind, string> = { lehrer: "Lehrkraft", klasse: "Klasse", fach: "Fach", raum: "Raum" };
export const findingHref = (f: Finding): string => `${ENTITY_PAGE[f.kind]}?id=${f.id}`;
export const countBy = (fs: Finding[]): { errors: number; warns: number } => ({
  errors: fs.filter((f) => f.sev === "error").length,
  warns: fs.filter((f) => f.sev === "warn").length,
});

/** "2 Fehler · 1 Hinweis" */
export function summaryText(fs: Finding[]): string {
  const { errors, warns } = countBy(fs);
  if (!errors && !warns) return "Keine Probleme";
  const parts: string[] = [];
  if (errors) parts.push(`${errors} ${errors === 1 ? "Fehler" : "Fehler"}`);
  if (warns) parts.push(`${warns} ${warns === 1 ? "Hinweis" : "Hinweise"}`);
  return parts.join(" · ");
}

/** findings for one entity, for the badges on the data pages */
export function findingsFor(fs: Finding[], kind: EntityKind, id: number): Finding[] {
  return fs.filter((f) => f.kind === kind && f.id === id);
}
