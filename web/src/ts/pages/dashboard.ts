import initNavbar from "./navbar.js";
import { initImportButton } from "../features/importButton.js";
import { initExportButton } from "../features/exportButton.js";
import { roomTypeLabel } from "../features/roomTypeSelector.js";
import { smartCase } from "../utils/elementHelpers.js";
import type { Teacher } from "../types/teacher.js";
import type { Subject } from "../types/subject.js";
import type { Room, RoomType } from "../types/room.js";
import type { ClassSubject } from "../types/classSubject.js";
import type { SchoolClass } from "../types/schoolClass.js";

// -----------------------------------------------------------------------------
// Dashboard
//
// The dashboard answers three questions without the user clicking anywhere:
//   1. What is in the database?              → stat strip
//   2. Can a timetable be generated from it? → readiness checks + planning card
//   3. Where is the load / the bottleneck?   → class hours, teacher load, rooms
//
// Every number below is derived from the data the other pages already manage,
// so the page never duplicates the sidebar's navigation.
// -----------------------------------------------------------------------------

const API_BASE_URL = "http://localhost:8080/api";

const DAYS_PER_WEEK = 5;
const UNITS_PER_DAY = 10;
const SLOTS_PER_WEEK = DAYS_PER_WEEK * UNITS_PER_DAY;

const ALL_ROOM_TYPES: RoomType[] = [
  "CLASSROOM",
  "EDV",
  "CHEM",
  "PHY",
  "SPORT",
  "WORKSHOP",
];

type HistoryEntry = { iteration: number; cost: number };

type Snapshot = {
  reachable: boolean;
  teachers: Teacher[];
  subjects: Subject[];
  rooms: Room[];
  classSubjects: ClassSubject[];
  classes: SchoolClass[];
  algorithmRunning: boolean;
  algorithmRanOnce: boolean;
  history: HistoryEntry[];
};

// -------------------------------------------------------------------- loading

let backendReachable = true;

// The dashboard reads six endpoints at once. A failing one must not raise six
// toasts, so it loads silently and the page shows one offline notice instead.
async function silentGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`);
    if (!response.ok) return fallback;
    const value = (await response.json()) as T | null;
    return value ?? fallback;
  } catch {
    backendReachable = false;
    return fallback;
  }
}

async function loadSnapshot(): Promise<Snapshot> {
  backendReachable = true;

  const [
    teachers,
    subjects,
    rooms,
    classSubjects,
    classes,
    algorithmRunning,
    algorithmRanOnce,
    history,
  ] = await Promise.all([
    silentGet<Teacher[]>("/teachers/withWishes", []),
    silentGet<Subject[]>("/subjects", []),
    silentGet<Room[]>("/rooms", []),
    silentGet<ClassSubject[]>("/classSubjects", []),
    silentGet<SchoolClass[]>("/getAllClasses", []),
    silentGet<boolean>("/isAlgorithmRunning", false),
    silentGet<boolean>("/isAlgorithmRunningAtLeastOnce", false),
    silentGet<HistoryEntry[]>("/get/algorithmHistory", []),
  ]);

  return {
    reachable: backendReachable,
    teachers,
    subjects,
    rooms,
    classSubjects,
    classes,
    algorithmRunning,
    algorithmRanOnce,
    history,
  };
}

// ------------------------------------------------------------------- derived

type ClassLoad = {
  className: string;
  weeklyHours: number;
  subjectCount: number;
  hasRoom: boolean;
};

type TeacherLoad = {
  name: string;
  symbol: string;
  weeklyHours: number;
  availableHours: number;
};

type RoomDemand = {
  type: RoomType;
  rooms: number;
  demandHours: number;
  capacityHours: number;
};

// Weekly hours per class, merged with the class list so classes without any
// subject still show up (they are the ones that need attention).
function classLoads(snapshot: Snapshot): ClassLoad[] {
  const byName = new Map<string, ClassLoad>();

  for (const schoolClass of snapshot.classes) {
    byName.set(schoolClass.className, {
      className: schoolClass.className,
      weeklyHours: 0,
      subjectCount: 0,
      hasRoom: schoolClass.classRoom !== null,
    });
  }

  for (const item of snapshot.classSubjects) {
    const entry = byName.get(item.className) ?? {
      className: item.className,
      weeklyHours: 0,
      subjectCount: 0,
      hasRoom: false,
    };
    entry.weeklyHours += item.weeklyHours;
    entry.subjectCount += 1;
    byName.set(item.className, entry);
  }

  return [...byName.values()].sort((a, b) => b.weeklyHours - a.weeklyHours);
}

// Weekly hours per teacher. A lesson taught by two teachers counts for both –
// both of them are blocked during that period.
function teacherLoads(snapshot: Snapshot): TeacherLoad[] {
  const hoursById = new Map<number, number>();

  for (const item of snapshot.classSubjects) {
    for (const teacher of item.teacher ?? []) {
      hoursById.set(
        teacher.id,
        (hoursById.get(teacher.id) ?? 0) + item.weeklyHours,
      );
    }
  }

  return snapshot.teachers
    .map((teacher) => ({
      name: smartCase(teacher.teacherName),
      symbol: teacher.nameSymbol,
      weeklyHours: hoursById.get(teacher.id) ?? 0,
      availableHours: Math.max(
        0,
        SLOTS_PER_WEEK - (teacher.teacherNonWorkingHours?.length ?? 0),
      ),
    }))
    .sort((a, b) => b.weeklyHours - a.weeklyHours);
}

// The /classSubjects payload carries a slim subject without its room
// requirements, so they are looked up in the full subject list.
function requiredTypesOf(snapshot: Snapshot, item: ClassSubject): RoomType[] {
  const own = item.subject?.requiredRoomTypes;
  if (own && own.length > 0) return own;
  const full = snapshot.subjects.find(
    (subject) => subject.id === item.subject?.id,
  );
  return full?.requiredRoomTypes ?? [];
}

// Demand per room type: the weekly hours of every lesson whose subject asks
// for that type, against the slots the existing rooms of that type provide.
// Lessons without a special requirement need an ordinary classroom.
function roomDemands(snapshot: Snapshot): RoomDemand[] {
  const demand = new Map<RoomType, number>();
  const supply = new Map<RoomType, number>();

  for (const room of snapshot.rooms) {
    for (const type of room.roomTypes ?? []) {
      supply.set(type, (supply.get(type) ?? 0) + 1);
    }
  }

  for (const item of snapshot.classSubjects) {
    const types = requiredTypesOf(snapshot, item);
    const targets: RoomType[] = types.length > 0 ? types : ["CLASSROOM"];
    for (const type of targets) {
      demand.set(type, (demand.get(type) ?? 0) + item.weeklyHours);
    }
  }

  return ALL_ROOM_TYPES.map((type) => ({
    type,
    rooms: supply.get(type) ?? 0,
    demandHours: demand.get(type) ?? 0,
    capacityHours: (supply.get(type) ?? 0) * SLOTS_PER_WEEK,
  })).filter((entry) => entry.rooms > 0 || entry.demandHours > 0);
}

// Subjects nobody is qualified to teach.
function subjectsWithoutTeacher(snapshot: Snapshot): Subject[] {
  const taught = new Set<number>();
  for (const teacher of snapshot.teachers) {
    for (const subject of teacher.teachingSubject ?? []) taught.add(subject.id);
  }
  return snapshot.subjects.filter((subject) => !taught.has(subject.id));
}

// Room types a subject requires but no room provides.
function missingRoomTypes(snapshot: Snapshot): RoomType[] {
  const available = new Set<RoomType>();
  for (const room of snapshot.rooms) {
    for (const type of room.roomTypes ?? []) available.add(type);
  }

  const required = new Set<RoomType>();
  for (const subject of snapshot.subjects) {
    for (const type of subject.requiredRoomTypes ?? []) required.add(type);
  }

  return [...required].filter((type) => !available.has(type));
}

function totalWeeklyHours(snapshot: Snapshot): number {
  return snapshot.classSubjects.reduce(
    (sum, item) => sum + item.weeklyHours,
    0,
  );
}

function isEmpty(snapshot: Snapshot): boolean {
  return (
    snapshot.teachers.length === 0 &&
    snapshot.subjects.length === 0 &&
    snapshot.rooms.length === 0 &&
    snapshot.classes.length === 0
  );
}

// ---------------------------------------------------------- DOM mini helpers

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function icon(classes: string): HTMLElement {
  const i = el("i", classes);
  i.setAttribute("aria-hidden", "true");
  return i;
}

// Panel head: title, optional caption and an optional link on the right.
function panelHead(
  title: string,
  caption?: string,
  link?: { href: string; label: string },
): HTMLElement {
  const head = el("div", "panel__head");

  const text = el("div", "panel__heading");
  text.appendChild(el("h2", "panel__title", title));
  if (caption) text.appendChild(el("p", "panel__caption", caption));
  head.appendChild(text);

  if (link) {
    const anchor = el("a", "panel__link");
    anchor.href = link.href;
    anchor.append(link.label, icon("ti ti-arrow-right"));
    head.appendChild(anchor);
  }

  return head;
}

function formatNumber(value: number): string {
  return value.toLocaleString("de-AT", { maximumFractionDigits: 0 });
}

function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

// A labelled progress bar row used by the class, teacher and room panels.
function barRow(options: {
  label: string;
  sub?: string;
  value: string;
  ratio: number;
  tone?: "primary" | "accent" | "success" | "danger";
}): HTMLElement {
  const row = el("li", "bar-row");
  row.dataset.tone = options.tone ?? "primary";

  const top = el("div", "bar-row__top");
  const label = el("span", "bar-row__label", options.label);
  const value = el("span", "bar-row__value", options.value);
  top.append(label, value);

  const track = el("div", "bar-row__track");
  const fill = el("span", "bar-row__fill");
  fill.style.width = `${Math.max(2, Math.min(100, options.ratio * 100))}%`;
  track.appendChild(fill);

  row.append(top, track);
  if (options.sub) row.appendChild(el("span", "bar-row__sub", options.sub));
  return row;
}

function emptyHint(text: string): HTMLElement {
  return el("p", "panel__hint", text);
}

// ------------------------------------------------------------ header actions

function renderActions(snapshot: Snapshot): void {
  const host = document.getElementById("dashboard-actions");
  if (!host) return;
  host.replaceChildren();

  // Import – importButton.ts binds #excel-upload / #import-file-name /
  // #import-error, so those elements have to exist with exactly those ids.
  const input = el("input");
  input.type = "file";
  input.id = "excel-upload";
  input.accept = ".xlsx,.xls";
  input.hidden = true;

  const importButton = el("button", "btn btn--soft", "Excel importieren");
  importButton.type = "button";
  importButton.prepend(icon("ti ti-upload"));
  importButton.addEventListener("click", () => input.click());

  // Export – exportButton.ts binds #excel-export / #export-error.
  const exportButton = el("button", "btn btn--secondary", "Exportieren");
  exportButton.type = "button";
  exportButton.id = "excel-export";
  exportButton.prepend(icon("ti ti-download"));
  exportButton.disabled = isEmpty(snapshot);

  const timetable = el("a", "btn btn--primary", "Stundenplan öffnen");
  (timetable as HTMLAnchorElement).href = "timetable.html";
  timetable.prepend(icon("ti ti-calendar-week"));

  const status = el("p", "action-status");
  status.id = "import-file-name";
  const importError = el("p", "action-error");
  importError.id = "import-error";
  const exportError = el("p", "action-error");
  exportError.id = "export-error";

  host.append(
    input,
    importButton,
    exportButton,
    timetable,
    status,
    importError,
    exportError,
  );

  initImportButton();
  initExportButton();
}

// ------------------------------------------------------------------- notices

function renderNotice(snapshot: Snapshot): void {
  const host = document.getElementById("dashboard-notice");
  if (!host) return;
  host.replaceChildren();

  if (!snapshot.reachable) {
    host.hidden = false;
    host.className = "notice notice--danger card";
    host.append(
      icon("ti ti-plug-connected-x"),
      el(
        "div",
        "notice__text",
        "Das Backend ist nicht erreichbar. Die angezeigten Zahlen sind leer, bis der Server unter localhost:8080 läuft.",
      ),
    );
    return;
  }

  if (isEmpty(snapshot)) {
    host.hidden = false;
    host.className = "notice notice--info card";
    const text = el("div", "notice__text");
    text.append(
      el("strong", undefined, "Noch keine Daten vorhanden. "),
      "Importieren Sie eine Excel-Datei oder legen Sie Lehrer, Fächer, Räume und Klassen über die Seitenleiste an.",
    );
    host.append(icon("ti ti-database-off"), text);
    return;
  }

  host.hidden = true;
}

// ---------------------------------------------------------------- stat strip

type Stat = {
  icon: string;
  label: string;
  value: number;
  meta: string;
  color: string;
  href: string;
};

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Counts a number up from 0 over ~600 ms (skipped under reduced motion).
function animateCount(target: HTMLElement, value: number): void {
  if (prefersReducedMotion || value === 0) {
    target.textContent = formatNumber(value);
    return;
  }

  const duration = 600;
  const start = performance.now();

  const tick = (now: number) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    target.textContent = formatNumber(Math.round(value * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function buildStats(snapshot: Snapshot): Stat[] {
  const loads = teacherLoads(snapshot);
  const withoutHours = loads.filter((load) => load.weeklyHours === 0).length;
  const hours = totalWeeklyHours(snapshot);
  const coveredTypes = new Set<RoomType>();
  for (const room of snapshot.rooms) {
    for (const type of room.roomTypes ?? []) coveredTypes.add(type);
  }
  const orphanSubjects = subjectsWithoutTeacher(snapshot).length;

  return [
    {
      icon: "ti ti-users",
      label: "Lehrer",
      value: snapshot.teachers.length,
      meta:
        withoutHours > 0
          ? `${formatNumber(withoutHours)} ohne Unterricht`
          : "alle eingeteilt",
      color: "var(--color-primary)",
      href: "teacher.html",
    },
    {
      icon: "ti ti-school",
      label: "Klassen",
      value: snapshot.classes.length,
      meta: `${plural(hours, "Wochenstunde", "Wochenstunden")} gesamt`,
      color: "var(--color-accent)",
      href: "classSubjects.html",
    },
    {
      icon: "ti ti-door",
      label: "Räume",
      value: snapshot.rooms.length,
      meta: `${formatNumber(coveredTypes.size)} von ${ALL_ROOM_TYPES.length} Raumtypen`,
      color: "var(--color-success)",
      href: "rooms.html",
    },
    {
      icon: "ti ti-book-2",
      label: "Fächer",
      value: snapshot.subjects.length,
      meta:
        orphanSubjects > 0
          ? `${formatNumber(orphanSubjects)} ohne Lehrkraft`
          : "alle mit Lehrkraft",
      color: "var(--color-primary-hover)",
      href: "subjects.html",
    },
  ];
}

function renderStats(snapshot: Snapshot): void {
  const grid = document.getElementById("stats-grid");
  if (!grid) return;
  grid.replaceChildren();

  buildStats(snapshot).forEach((stat) => {
    const card = el("a", "stat-card card card--interactive");
    (card as HTMLAnchorElement).href = stat.href;
    card.style.setProperty("--card-color", stat.color);

    const box = el("div", "stat-icon");
    box.appendChild(icon(stat.icon));

    const value = el("span", "stat-value", "0");
    const label = el("span", "stat-label", stat.label);
    const meta = el("span", "stat-meta", stat.meta);

    card.append(box, value, label, meta);
    grid.appendChild(card);

    animateCount(value, stat.value);
  });
}

// ------------------------------------------------------------- readiness card

type CheckState = "ok" | "warn" | "blocked";

type Check = {
  state: CheckState;
  label: string;
  detail: string;
  href: string;
};

function buildChecks(snapshot: Snapshot): Check[] {
  const loads = classLoads(snapshot);
  const classesWithoutSubjects = loads.filter(
    (load) => load.subjectCount === 0,
  );
  const classesWithoutRoom = loads.filter((load) => !load.hasRoom);
  const lessonsWithoutTeacher = snapshot.classSubjects.filter(
    (item) => (item.teacher?.length ?? 0) === 0,
  );
  const orphanSubjects = subjectsWithoutTeacher(snapshot);
  const missingTypes = missingRoomTypes(snapshot);
  const overloadedTypes = roomDemands(snapshot)
    .filter((entry) => entry.demandHours > entry.capacityHours)
    .map((entry) => entry.type);

  return [
    {
      state: snapshot.teachers.length > 0 ? "ok" : "blocked",
      label: "Lehrkräfte angelegt",
      detail:
        snapshot.teachers.length > 0
          ? plural(snapshot.teachers.length, "Lehrkraft", "Lehrkräfte")
          : "Ohne Lehrkräfte kann nicht geplant werden",
      href: "teacher.html",
    },
    {
      state: snapshot.rooms.length > 0 ? "ok" : "blocked",
      label: "Räume angelegt",
      detail:
        snapshot.rooms.length > 0
          ? plural(snapshot.rooms.length, "Raum", "Räume")
          : "Ohne Räume kann nicht geplant werden",
      href: "rooms.html",
    },
    {
      state: classesWithoutSubjects.length === 0 ? "ok" : "blocked",
      label: "Klassen mit Fächern",
      detail:
        classesWithoutSubjects.length === 0
          ? `${plural(loads.length, "Klasse", "Klassen")} vollständig`
          : `Ohne Fächer: ${classesWithoutSubjects
              .slice(0, 4)
              .map((load) => load.className.toUpperCase())
              .join(", ")}${classesWithoutSubjects.length > 4 ? " …" : ""}`,
      href: "classSubjects.html",
    },
    {
      state: lessonsWithoutTeacher.length === 0 ? "ok" : "blocked",
      label: "Unterrichtseinheiten besetzt",
      detail:
        lessonsWithoutTeacher.length === 0
          ? "Jede Einheit hat eine Lehrkraft"
          : `${plural(lessonsWithoutTeacher.length, "Einheit", "Einheiten")} ohne Lehrkraft`,
      href: "classSubjects.html",
    },
    {
      state: orphanSubjects.length === 0 ? "ok" : "warn",
      label: "Fächer mit Lehrbefähigung",
      detail:
        orphanSubjects.length === 0
          ? "Jedes Fach wird von jemandem unterrichtet"
          : orphanSubjects
              .slice(0, 4)
              .map((subject) => subject.subjectSymbol || subject.subjectName)
              .join(", ") + (orphanSubjects.length > 4 ? " …" : ""),
      href: "subjects.html",
    },
    {
      state: missingTypes.length === 0 ? "ok" : "blocked",
      label: "Geforderte Raumtypen vorhanden",
      detail:
        missingTypes.length === 0
          ? "Alle Fachräume sind abgedeckt"
          : `Kein Raum für: ${missingTypes.map(roomTypeLabel).join(", ")}`,
      href: "rooms.html",
    },
    {
      state: overloadedTypes.length === 0 ? "ok" : "warn",
      label: "Raumkapazität ausreichend",
      detail:
        overloadedTypes.length === 0
          ? "Jeder Raumtyp hat genug freie Einheiten"
          : `Überbucht: ${overloadedTypes.map(roomTypeLabel).join(", ")}`,
      href: "rooms.html",
    },
    {
      state: classesWithoutRoom.length === 0 ? "ok" : "warn",
      label: "Klassen mit Stammraum",
      detail:
        classesWithoutRoom.length === 0
          ? "Jede Klasse hat einen Stammraum"
          : `${plural(classesWithoutRoom.length, "Klasse", "Klassen")} ohne Stammraum`,
      href: "classSubjects.html",
    },
  ];
}

const CHECK_ICON: Record<CheckState, string> = {
  ok: "ti ti-circle-check-filled",
  warn: "ti ti-alert-triangle-filled",
  blocked: "ti ti-circle-x-filled",
};

// Progress ring showing the share of passed checks.
function readinessRing(
  passed: number,
  total: number,
  tone: "ok" | "warn" | "blocked",
): HTMLElement {
  const percent = total === 0 ? 0 : Math.round((passed / total) * 100);
  const wrap = el("div", "ring");
  wrap.dataset.tone = tone;
  wrap.innerHTML = `
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle class="ring__track" cx="60" cy="60" r="52"></circle>
      <circle class="ring__value" cx="60" cy="60" r="52"
              stroke-dasharray="${(percent / 100) * 326.7} 326.7"></circle>
    </svg>
    <span class="ring__label">
      <strong>${percent}<small>%</small></strong>
      <span>${passed}/${total} erfüllt</span>
    </span>`;
  return wrap;
}

function renderReadiness(snapshot: Snapshot): void {
  const panel = document.getElementById("readiness-panel");
  if (!panel) return;
  panel.replaceChildren();

  const checks = buildChecks(snapshot);
  const passed = checks.filter((check) => check.state === "ok").length;
  const blocked = checks.filter((check) => check.state === "blocked").length;

  const warnings = checks.filter((check) => check.state === "warn").length;
  const tone = blocked > 0 ? "blocked" : warnings > 0 ? "warn" : "ok";

  panel.appendChild(
    panelHead(
      "Planungsbereitschaft",
      blocked > 0
        ? `${plural(blocked, "Punkt blockiert", "Punkte blockieren")} die Stundenplanerstellung.`
        : warnings > 0
          ? `Alle Pflichtangaben liegen vor – ${plural(warnings, "Hinweis", "Hinweise")} zur Qualität der Daten.`
          : "Die Daten reichen für einen Durchlauf des Algorithmus.",
    ),
  );

  const body = el("div", "readiness");
  body.appendChild(readinessRing(passed, checks.length, tone));

  const list = el("ul", "check-list");
  checks.forEach((check) => {
    const item = el("li", "check");
    item.dataset.state = check.state;

    const link = el("a", "check__link");
    link.href = check.href;

    const mark = el("span", "check__icon");
    mark.appendChild(icon(CHECK_ICON[check.state]));

    const text = el("span", "check__text");
    text.append(
      el("span", "check__label", check.label),
      el("span", "check__detail", check.detail),
    );

    link.append(mark, text, icon("ti ti-chevron-right check__chevron"));
    item.appendChild(link);
    list.appendChild(item);
  });

  body.appendChild(list);
  panel.appendChild(body);
}

// ------------------------------------------------------------- planning card

function metric(label: string, value: string, sub?: string): HTMLElement {
  const box = el("div", "metric");
  box.append(el("span", "metric__value", value), el("span", "metric__label", label));
  if (sub) box.appendChild(el("span", "metric__sub", sub));
  return box;
}

function renderPlanning(snapshot: Snapshot): void {
  const panel = document.getElementById("planning-panel");
  if (!panel) return;
  panel.replaceChildren();

  const last = snapshot.history.at(-1);
  const best = snapshot.history.reduce<number | null>(
    (min, entry) => (min === null || entry.cost < min ? entry.cost : min),
    null,
  );
  const scheduled = snapshot.classes.filter(
    (schoolClass) => schoolClass.timetable !== null,
  ).length;

  const state = snapshot.algorithmRunning
    ? "running"
    : snapshot.algorithmRanOnce
      ? "done"
      : "idle";
  const stateLabel = {
    running: "Optimierung läuft",
    done: "Optimierung pausiert",
    idle: "Noch nicht gestartet",
  }[state];

  panel.appendChild(
    panelHead("Stundenplanung", "Stand des Optimierers", {
      href: "timetable.html",
      label: "Zum Stundenplan",
    }),
  );

  const chip = el("span", "status-chip", stateLabel);
  chip.dataset.state = state === "idle" ? "" : state;
  panel.appendChild(chip);

  const grid = el("div", "metric-grid");
  grid.append(
    metric(
      "Zu verplanen",
      formatNumber(totalWeeklyHours(snapshot)),
      "Wochenstunden",
    ),
    metric(
      "Klassen mit Plan",
      `${formatNumber(scheduled)}/${formatNumber(snapshot.classes.length)}`,
      "Stundenpläne angelegt",
    ),
    metric(
      "Aktuelle Kosten",
      last ? formatNumber(last.cost) : "–",
      best !== null ? `Bester Wert: ${formatNumber(best)}` : "Noch kein Lauf",
    ),
    metric(
      "Iterationen",
      last ? formatNumber(last.iteration) : "–",
      `${plural(snapshot.history.length, "Messpunkt", "Messpunkte")}`,
    ),
  );
  panel.appendChild(grid);

  panel.appendChild(
    emptyHint(
      state === "idle"
        ? "Starten Sie die Optimierung auf der Stundenplan-Seite, sobald die Bereitschaft bei 100 % liegt."
        : "Die Kostenkurve des laufenden Verfahrens sehen Sie auf der Stundenplan-Seite.",
    ),
  );
}

// ------------------------------------------------------------- class workload

function renderClassHours(snapshot: Snapshot): void {
  const panel = document.getElementById("class-hours-panel");
  if (!panel) return;
  panel.replaceChildren();

  const loads = classLoads(snapshot);
  const total = loads.reduce((sum, load) => sum + load.weeklyHours, 0);
  const average = loads.length === 0 ? 0 : Math.round(total / loads.length);

  panel.appendChild(
    panelHead(
      "Wochenstunden je Klasse",
      loads.length === 0
        ? "Noch keine Klassen angelegt"
        : `Ø ${formatNumber(average)} h · ${plural(total, "Stunde", "Stunden")} gesamt`,
      { href: "classSubjects.html", label: "Klassen" },
    ),
  );

  if (loads.length === 0) {
    panel.appendChild(
      emptyHint(
        "Sobald Klassen mit Fächern vorhanden sind, zeigt diese Liste die Stundenverteilung.",
      ),
    );
    return;
  }

  const max = Math.max(...loads.map((load) => load.weeklyHours), 1);
  const list = el("ul", "bar-list");

  loads.forEach((load) => {
    list.appendChild(
      barRow({
        label: load.className.toUpperCase(),
        value: `${formatNumber(load.weeklyHours)} h`,
        sub:
          load.subjectCount === 0
            ? "Keine Fächer zugeordnet"
            : plural(load.subjectCount, "Fach", "Fächer"),
        ratio: load.weeklyHours / max,
        tone: load.subjectCount === 0 ? "danger" : "primary",
      }),
    );
  });

  panel.appendChild(list);
}

// ------------------------------------------------------------- teacher load

function renderTeacherLoad(snapshot: Snapshot): void {
  const panel = document.getElementById("teacher-load-panel");
  if (!panel) return;
  panel.replaceChildren();

  const loads = teacherLoads(snapshot);
  const assigned = loads.filter((load) => load.weeklyHours > 0);
  const average =
    assigned.length === 0
      ? 0
      : Math.round(
          assigned.reduce((sum, load) => sum + load.weeklyHours, 0) /
            assigned.length,
        );

  panel.appendChild(
    panelHead(
      "Lehrerauslastung",
      loads.length === 0
        ? "Noch keine Lehrkräfte angelegt"
        : `Ø ${formatNumber(average)} h je eingeteilter Lehrkraft`,
      { href: "teacher.html", label: "Lehrer" },
    ),
  );

  if (loads.length === 0) {
    panel.appendChild(
      emptyHint(
        "Die Auslastung ergibt sich aus den Wochenstunden der zugeordneten Unterrichtseinheiten.",
      ),
    );
    return;
  }

  const list = el("ul", "bar-list");

  loads.forEach((load) => {
    const ratio =
      load.availableHours === 0 ? 1 : load.weeklyHours / load.availableHours;
    list.appendChild(
      barRow({
        label: `${load.name}${load.symbol ? ` (${load.symbol})` : ""}`,
        value: `${formatNumber(load.weeklyHours)} h`,
        sub:
          load.weeklyHours === 0
            ? "Keine Einheiten zugeordnet"
            : `${Math.round(ratio * 100)} % von ${formatNumber(load.availableHours)} verfügbaren Stunden`,
        ratio,
        tone:
          load.weeklyHours === 0 ? "danger" : ratio > 0.8 ? "accent" : "primary",
      }),
    );
  });

  panel.appendChild(list);
  panel.appendChild(
    emptyHint(
      "Einheiten mit mehreren Lehrkräften zählen für jede von ihnen. Verfügbare Stunden = 50 Einheiten pro Woche abzüglich gesperrter Zeiten.",
    ),
  );
}

// -------------------------------------------------------------- room demand

function renderRoomDemand(snapshot: Snapshot): void {
  const panel = document.getElementById("room-demand-panel");
  if (!panel) return;
  panel.replaceChildren();

  const demands = roomDemands(snapshot);

  panel.appendChild(
    panelHead(
      "Räume & Raumbedarf",
      "Geforderte Wochenstunden gegen die vorhandenen Plätze – Einheiten ohne Fachraumbedarf zählen zum Klassenraum",
      { href: "rooms.html", label: "Räume" },
    ),
  );

  if (demands.length === 0) {
    panel.appendChild(
      emptyHint("Noch keine Räume angelegt und keine Fachräume gefordert."),
    );
    return;
  }

  const wrap = el("div", "table-wrap");
  const table = el("table", "data-table room-demand");
  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Raumtyp</th>
        <th scope="col" class="is-num">Räume</th>
        <th scope="col" class="is-num">Bedarf</th>
        <th scope="col" class="is-num">Kapazität</th>
        <th scope="col">Auslastung</th>
      </tr>
    </thead>`;

  const body = el("tbody");

  demands.forEach((entry) => {
    const ratio =
      entry.capacityHours === 0
        ? entry.demandHours > 0
          ? 1
          : 0
        : entry.demandHours / entry.capacityHours;
    const tone =
      ratio > 1 || (entry.capacityHours === 0 && entry.demandHours > 0)
        ? "danger"
        : ratio > 0.8
          ? "accent"
          : "success";

    const row = el("tr");

    const name = el("th");
    name.scope = "row";
    name.textContent = roomTypeLabel(entry.type);

    const rooms = el("td", "is-num", formatNumber(entry.rooms));
    const demand = el("td", "is-num", `${formatNumber(entry.demandHours)} h`);
    const capacity = el(
      "td",
      "is-num",
      `${formatNumber(entry.capacityHours)} h`,
    );

    const usage = el("td", "room-demand__usage");
    const track = el("div", "bar-row__track");
    track.dataset.tone = tone;
    const fill = el("span", "bar-row__fill");
    fill.style.width = `${Math.max(2, Math.min(100, ratio * 100))}%`;
    track.appendChild(fill);
    usage.append(
      track,
      el(
        "span",
        "room-demand__value",
        entry.capacityHours === 0
          ? "kein Raum"
          : `${Math.round(ratio * 100)} %`,
      ),
    );

    row.append(name, rooms, demand, capacity, usage);
    body.appendChild(row);
  });

  table.appendChild(body);
  wrap.appendChild(table);
  panel.appendChild(wrap);

  const overloaded = demands.filter(
    (entry) => entry.demandHours > entry.capacityHours,
  );
  panel.appendChild(
    emptyHint(
      overloaded.length === 0
        ? "Kapazität = Räume × 50 Einheiten pro Woche (5 Tage à 10 Einheiten)."
        : `Über der Kapazität: ${overloaded
            .map((entry) => roomTypeLabel(entry.type))
            .join(", ")}. Der Algorithmus findet dafür keine gültige Belegung – zusätzliche Räume dieses Typs anlegen.`,
    ),
  );
}

// -------------------------------------------------------------------- start

// Initialize the dashboard application.
export async function initializeApp() {
  initNavbar();

  const snapshot = await loadSnapshot();

  renderActions(snapshot);
  renderNotice(snapshot);
  renderStats(snapshot);
  renderReadiness(snapshot);
  renderPlanning(snapshot);
  renderClassHours(snapshot);
  renderTeacherLoad(snapshot);
  renderRoomDemand(snapshot);
}

document.addEventListener("DOMContentLoaded", initializeApp);
