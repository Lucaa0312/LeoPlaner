/*import { clearCharts } from "./graph.js";
import { getElement, aquireElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";
import { getFetchResponse } from "../utils/apiHelpers.js";

// click out of box closes dropdown
document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as Element | null;
    const isClickInside = target?.closest(".top-bar-select");
    if (isClickInside) return;

    document.querySelectorAll<HTMLElement>(".top-bar-select").forEach((wrapper) => {
        wrapper.classList.remove("is-open");
    });
});

// JavaScript for Timetable Page
let breakAfterPeriod = 3;

const times: string[] = [
    "07:05", "07:55", "08:00", "08:50", "08:55",
    "09:45", "10:00", "10:50", "10:55", "11:45",
    "11:50", "12:40", "12:45", "13:35", "13:40",
    "14:30", "14:35", "15:25", "15:30", "16:20",
    "16:25", "17:15", "17:20", "18:05", "18:50",
    "19:00", "19:45", "20:30", "20:40", "21:25",
    "22:10"
];

type SubjectColor = {
    red: number;
    green: number;
    blue: number;
};

type TimetableSubject = {
    id: number;
    subjectName: string;
    subjectColor?: SubjectColor;
    subjectSymbol: string
};

type TimetableTeacher = {
    id: number;
    teacherName: string;
    nameSymbol: string;
};

type TimetableClassSubject = {
    subject?: TimetableSubject;
    teacher?: TimetableTeacher;
};

type Period = {
    schoolDays: string;
    schoolHour: number;
    lunchBreak: boolean;
};

type Room = {
    id?: number;
    roomNumber?: string | number;
};

type ClassSubjectInstance = {
    classSubject?: TimetableClassSubject;
    period: Period;
    duration?: number;
    room?: Room;
};

type TeacherNonWorkingHour = {
    day: string;
    schoolHour: number;
};

type TeacherDetails = {
    id: number;
    teacherName: string;
    nameSymbol: string;
    teacherNonWorkingHours: TeacherNonWorkingHour[];
};

type TimetableByClassResponse = {
    classSubjectInstances: ClassSubjectInstance[];
};

type TimetableByTeacherResponse = {
    timetableDTO: {
        classSubjectInstances: ClassSubjectInstance[];
    };
    teacher: TeacherDetails;
};

type TimetableByRoomResponse = {
    classSubjectInstances: ClassSubjectInstance[];
};

export function load(): void {
    clearLayout();
    fetch("http://localhost:8080/api/timetable/getByClass/1")
        .then((response) => {
            return response.json() as Promise<TimetableByClassResponse>;
        })
        .then((data) => {
            createLayout(data.classSubjectInstances);
        })
        .catch((error) => {
            console.error("Error loading Timetable:", error);
        })
        .finally(() => {
            //hideLoader();
        });
}

const randomizeButton = aquireElement<HTMLElement>("randomizeButton");
randomizeButton.addEventListener("click", getRandomizedTimeTable)
export async function getRandomizedTimeTable(): Promise<void> {
    clearLayout();
    clearCharts();
    await getFetchResponse("/randomize");
    load();
}

export function getTimetableByTeacher(teacherId: string): void {
    clearLayout();
    fetch(`http://localhost:8080/api/timetable/getByTeacher/${teacherId}`)
        .then((response) => {
            return response.json() as Promise<TimetableByTeacherResponse>;
        })
        .then((data) => {
            console.log("Fetched data:", data);
            createLayout(data.timetableDTO.classSubjectInstances);
            createRedArea(data.teacher);
            hideTimetableCost();
        })
        .catch((error) => {
            console.error("Error loading Timetable by teacher:", error);
        });
}

export function getTimetableByClass(classId: string): void {
    fetch(`http://localhost:8080/api/timetable/getByClass/${classId}`)
        .then((response) => {
            return response.json() as Promise<TimetableByClassResponse>;
        })
        .then((data) => {
            console.log(data);
            createLayout(data.classSubjectInstances);
        })
        .catch((error) => {
            console.error("Error loading Timetable by class:", error);
        });
}

export function getTimetableByRoom(roomId: string): void {
    fetch(`http://localhost:8080/api/timetable/getByRoom/${roomId}`)
        .then((response) => {
            return response.json() as Promise<TimetableByRoomResponse>;
        })
        .then((data) => {
            console.log(data);
            createLayout(data.classSubjectInstances);
            hideTimetableCost();
        })
        .catch((error) => {
            console.error("Error loading Timetable by room:", error);
        });
}

function clearChoice(): void {
    window.location.href = "./timetable.html";
    load();
}

function createRedArea(teacher: TeacherDetails): void {
    console.log("Teacher data:", teacher);
    const noWorkingHours: ClassSubjectInstance[] = [];

    for (let i = 0; i < teacher.teacherNonWorkingHours.length; i++) {
        noWorkingHours.push({
            classSubject: {
                subject: {
                    id: 2,
                    subjectName: "RedArea",
                    subjectSymbol: "NA",
                },
                teacher: {
                    id: teacher.id,
                    teacherName: teacher.teacherName,
                    nameSymbol: teacher.nameSymbol
                }
            },
            period: {
                schoolDays: teacher.teacherNonWorkingHours[i]!.day,
                schoolHour: teacher.teacherNonWorkingHours[i]!.schoolHour,
                lunchBreak: false
            }
        });
    }

    console.log("No working hours:", noWorkingHours);
    createLayout(noWorkingHours);
}

function createLayout(data: ClassSubjectInstance[]): void {
    console.log("Raw data:", data);
    const map = new Map<string, ClassSubjectInstance[]>();

    // Note: Data will not follow any particular order
    data.forEach((item) => {
        if (!map.has(item.period.schoolDays)) {
            map.set(item.period.schoolDays, []);
        }
        map.get(item.period.schoolDays)?.push(item);
    });

    for (const [, entries] of map) {
        entries.sort((a, b) =>
            a.period.schoolHour - b.period.schoolHour
        );
    }

    console.log("Map:", map);
    let timesBuilder = ``;
    let linePlacer = ``;

    //load period start and end time
    for (let i = 0; i < times.length; i += 2) {
        if (i === breakAfterPeriod * 2) {
            timesBuilder += `<div class="break-box"></div>\n`;
            linePlacer += `<div class="break-line"></div>\n`;
        }

        timesBuilder += `<div class="period-box">
        <p class="period-started">${times[i]}</p>
        <p class="current-period">${i / 2}. EH</p>
        <p class="period-ended">${times[i + 1] || ""}</p>
        </div>\n`;

        linePlacer += `<div class="period-line"></div>\n`;
    }

    const timetableTimes = getElement<HTMLElement>("timetable-times");
    const timetableBackground = getElement<HTMLElement>("timetable-background");

    if (timetableTimes) {
        timetableTimes.innerHTML = timesBuilder;
    }

    if (timetableBackground) {
        timetableBackground.innerHTML = linePlacer;
    }

    // value, key
    map.forEach((classSubjectInstances, day) => {
        let content = ``;
        const dayContainer = getElement<HTMLElement>(day);
        const gridBox = dayContainer?.querySelector<HTMLElement>(".periods");

        if (!gridBox) return;

        gridBox.innerHTML = "";

        let currentPeriod = 0;

        let alreadyAddedBreak = false;
        let lessonAfterBreakCounter = 0;

        // Create HTML
        classSubjectInstances.forEach((item) => {
            const subjectSymbol = item.classSubject?.subject?.subjectSymbol || "";
            const subjectName = item.classSubject?.subject?.subjectName || "No lesson";
            const teacherSymbol = item.classSubject?.teacher?.nameSymbol || "-";
            const duration = item.duration || 1;

            // WARNING: Will overwrite 0 rgb values, so choose 1
            // e.g. red = rgb(255, 1, 1) instead of rgb(255, 0, 0)
            const subjectColorRed = item.classSubject?.subject?.subjectColor?.red || 200;
            const subjectColorGreen = item.classSubject?.subject?.subjectColor?.green || 200;
            const subjectColorBlue = item.classSubject?.subject?.subjectColor?.blue || 200;
            const period = item.period.schoolHour;

            const roomNumber = item.room?.roomNumber;
            const lunchBreak = item.period.lunchBreak;

            // Fill empty periods
            while (currentPeriod < period) {
                content += `<div class="period-styling" style=" margin-top: ${currentPeriod == 3 ? "calc(var(--break-height) + 3px)" : "0"};"></div>`;
                currentPeriod++;
            }

            if (!lunchBreak && subjectName !== "No lesson" && subjectName !== "RedArea") {
                
                let height: string;
                let marginTop = "0";

                if (!alreadyAddedBreak && duration >= 3 && period == 1 || duration >= 3 && period == 2 || duration >= 2 && period == 2) {
                    height = duration === 1
                        ? "var(--period-height)"
                        : `calc(var(--period-height) * ${duration} + 5px * ${duration - 1} + var(--break-height) + 3px)`;
                    alreadyAddedBreak = true;
                } else {
                    if (period == 3 && !alreadyAddedBreak) {
                            marginTop = "calc(var(--break-height) + 3px)";
                    }
                    height = duration === 1
                        ? "var(--period-height)"
                        : `calc(var(--period-height) * ${duration} + 5px * ${duration - 1})`;
                }

                content += `
                <div class="period-styling" style="background-color: rgba(${subjectColorRed}, ${subjectColorGreen}, ${subjectColorBlue}, 0.4); height: ${height}; margin-top: ${marginTop};">
                <div class="subject-color-line" style="background-color: rgb(${subjectColorRed}, ${subjectColorGreen}, ${subjectColorBlue});"></div>
                    <div class="subject-infos">
                        <p class="subject-styling">${subjectSymbol}</p>
                        <div class="room-teacher-container">
                            <p class="room-styling">E${roomNumber ?? ""}</p>
                            <p class="teacher-styling">${teacherSymbol}</p>
                        </div>
                    </div>
                </div>
                `;
                } else if (subjectName === "RedArea") {
                    content += `
                    <div class="period-styling non-working-stripes" style="margin-top: ${period == 3 ? "calc(var(--break-height) + 3px)" : "0"};">
                    <p>Nicht Verfügbar</p>
                    </div>
                `;
                } else {
                    content += `
                    <div class="period-styling" style=" margin-top: ${period == 3 ? "calc(var(--break-height) + 3px)" : "0"};">
                    </div>
                    `;
                }
                currentPeriod += duration;
            //lessonAfterBreakCounter+=duration;
            //console.log('lessonAfterBreakCounter:', lessonAfterBreakCounter, 'period:', period, 'day:', day);
        });
        gridBox.innerHTML = content;
    });
}

export function clearLayout(): void {
    const days: string[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    days.forEach((day) => {
        const dayContainer = getElement<HTMLElement>(day);
        const gridBox = dayContainer?.querySelector<HTMLElement>(".periods");
        if (gridBox) {
            gridBox.innerHTML = "";
        }
    });
}

function showLoader(): void {
    const loader = document.querySelector<HTMLElement>(".loader");
    const disableOverlay = getElement<HTMLElement>("disable-overlay");
    const optimizingText = getElement<HTMLElement>("optimizing-text");

    if (loader) {
        loader.style.display = "grid";
    }
    if (disableOverlay) {
        disableOverlay.style.display = "block";
    }
    if (optimizingText) {
        optimizingText.style.display = "block";
    }
}

function hideLoader(): void {
    const loader = document.querySelector<HTMLElement>(".loader");
    const disableOverlay = getElement<HTMLElement>("disable-overlay");
    const optimizingText = getElement<HTMLElement>("optimizing-text");

    if (loader) {
        loader.style.display = "none";
    }
    if (disableOverlay) {
        disableOverlay.style.display = "none";
    }
    if (optimizingText) {
        optimizingText.style.display = "none";
    }
}

function hideTimetableCost(): void {
}

function initializeApp(): void {
    load();
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);*/

import { getElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";

//--------------------------------------------------------------
type SubjectColor = {
    red: number;
    green: number;
    blue: number;
};

type TimetableSubject = {
    id: number;
    subjectName: string;
    subjectColor?: SubjectColor;
    subjectSymbol: string
};

type TimetableTeacher = {
    id: number;
    teacherName: string;
    nameSymbol: string;
};

type TimetableClassSubject = {
    subject?: TimetableSubject;
    teacher?: TimetableTeacher;
};

type Period = {
    schoolDays: string;
    schoolHour: number;
    lunchBreak: boolean;
};

type Room = {
    id?: number;
    roomNumber?: string | number;
};

type ClassSubjectInstance = {
    classSubject?: TimetableClassSubject;
    period: Period;
    duration?: number;
    room?: Room;
};

type TeacherNonWorkingHour = {
    day: string;
    schoolHour: number;
};

type TeacherDetails = {
    id: number;
    teacherName: string;
    nameSymbol: string;
    teacherNonWorkingHours: TeacherNonWorkingHour[];
};

type TimetableByClassResponse = {
    classSubjectInstances: ClassSubjectInstance[];
};

type TimetableByTeacherResponse = {
    timetableDTO: {
        classSubjectInstances: ClassSubjectInstance[];
    };
    teacher: TeacherDetails;
};

type TimetableByRoomResponse = {
    classSubjectInstances: ClassSubjectInstance[];
};

interface Unit {
    eh: string;
    start: string;
    end: string;
}

interface Lesson {
    day: string;
    rowStart: number;
    rowSpan: number;
    subject: string;
    room: string;
    teacher: string;
    color: string;
}

const DAYS = ["MO", "DI", "MI", "DO", "FR", "SA"];

const units: Unit[] = [
    { eh: '1. EH', start: '08:00', end: '08:50' },
    { eh: '2. EH', start: '08:55', end: '09:45' },
    { eh: '3. EH', start: '10:00', end: '10:50' },
    { eh: '4. EH', start: '10:55', end: '11:45' },
    { eh: '5. EH', start: '11:50', end: '12:40' },
    { eh: '6. EH', start: '12:45', end: '13:35' },
    { eh: '7. EH', start: '13:40', end: '14:30' },
    { eh: '8. EH', start: '14:35', end: '15:25' },
    { eh: '9. EH', start: '15:30', end: '16:20' },
    { eh: '10. EH', start: '16:25', end: '17:15' },
]

let lessons: Lesson[] = []

const ROW_HEIGHT = 200;

function initializeLayout() {
    let grid = getElement<HTMLElement>("timetable-content");
    
}

function clearLayout() {

}

function loadTimetable(): void {
    clearLayout();
    fetch("http://localhost:8080/api/timetable/getByClass/1")
        .then((response) => {
            return response.json() as Promise<TimetableByClassResponse>;
        })
        .then((data) => {
            console.log(data.classSubjectInstances)
            createLayout(data.classSubjectInstances);
        })
        .catch((error) => {
            console.error("Error loading Timetable:", error);
        });
}

function createLayout(data: ClassSubjectInstance[]) {

}

function initializeApp(): void {
    initNavbar();
    initializeLayout();
    loadTimetable();
}

document.addEventListener("DOMContentLoaded", initializeApp);
