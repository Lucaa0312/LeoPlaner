import { clearCharts } from "./graph.js";
import { getElement } from "../utils/elementHelpers.js";
import initNavbar from "./navbar.js";

// Dropdown button trigger
document.querySelectorAll<HTMLElement>(".top-bar-select").forEach((wrapper) => {
    const trigger = wrapper.querySelector<HTMLElement>(".select-trigger");
    const menu = wrapper.querySelector<HTMLElement>(".select-menu");

    if (!trigger || !menu) return;

    trigger.addEventListener("click", () => {
        wrapper.classList.toggle("is-open");
    });

    // click on dropdown item
    menu.addEventListener("click", (event: MouseEvent) => {
        const target = event.target as Element | null;
        const li = target?.closest("li") as HTMLLIElement | null;
        if (!li) return;

        const previouslySelected = menu.querySelector<HTMLElement>(".selected-item");
        if (previouslySelected) {
            previouslySelected.classList.remove("selected-item");
        }

        wrapper.classList.remove("is-open");
        li.classList.add("selected-item");

        const data = li.dataset.value;
        const selectedCategory = wrapper.id;

        if (!data) return;

        if (selectedCategory === "teachers") {
            getTimetableByTeacher(data);
        }

        if (selectedCategory === "classes") {
            getTimetableByClass(data);
        }

        if (selectedCategory === "rooms") {
            getTimetableByRoom(data);
        }
        // Add more conditions HERE
    });
});

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

type ClassItem = {
    id: number;
    className: string;
};

type TeacherItem = {
    id: number;
    nameSymbol: string;
};

type RoomItem = {
    id: number;
    roomNumber: string | number;
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

//getElement("randomizeButton")?.addEventListener("click", getRandomizedTimeTable);
function getRandomizedTimeTable(): void {
    clearLayout();
    fetch("http://localhost:8080/api/timetable/randomize")
        .then((response) => {
            return response.json() as Promise<TimetableByClassResponse>;
        })
        .then((data) => {
            createLayout(data.classSubjectInstances);
        })
        .catch((error) => {
            console.error("Error randomizing Timetable:", error);
        });
}

const algorithmButton = getElement<HTMLElement>("algorithmButton");
const algorithmToggleButton = getElement<HTMLElement>("optimizeButton");

algorithmButton?.addEventListener("click", () => {
    if (!algorithmToggleButton) return;

    algorithmToggleButton.style.opacity = "1";
    algorithmToggleButton.classList.add("optimizeButtonHover");
    getOptimizedTimetable();
});

function getOptimizedTimetable(): void {
    clearCharts();
    //showLoader();
    clearLayout();
    fetch("http://localhost:8080/api/run/algorithmAllClasses", { method: "GET" })
        .then((res) => {
            if (!res.ok) throw new Error("Request failed: " + res.status);
            load();
        })
        .catch(console.error);
}

function getTimetableByTeacher(teacherId: string): void {
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

function getTimetableByClass(classId: string): void {
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

function getTimetableByRoom(roomId: string): void {
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

function clearLayout(): void {
    const days: string[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    days.forEach((day) => {
        const dayContainer = getElement<HTMLElement>(day);
        const gridBox = dayContainer?.querySelector<HTMLElement>(".periods");
        if (gridBox) {
            gridBox.innerHTML = "";
        }
    });

    loadClasses();
    loadTeachers();
    loadRooms();
}

function loadClasses(): void {
    fetch(`http://localhost:8080/api/getAllClasses`)
        .then((response) => {
            return response.json() as Promise<ClassItem[]>;
        })
        .then((data) => {
            console.log(data);
            const dropdownWrapper = getElement<HTMLElement>("classes");
            const dropdown = dropdownWrapper?.querySelector<HTMLElement>(".select-menu");
            if (!dropdown) return;

            dropdown.innerHTML = "";

            data.forEach((clazz) => {
                dropdown.innerHTML += `<li data-value="${clazz.id}">${clazz.className}</li>`;
            });
        })
        .catch((error) => {
            console.error("Error loading all classes into dropdown: ", error);
        });
}

function loadTeachers(): void {
    fetch(`http://localhost:8080/api/teachers`)
        .then((response) => {
            return response.json() as Promise<TeacherItem[]>;
        })
        .then((data) => {
            console.log(data);
            const dropdownWrapper = getElement<HTMLElement>("teachers");
            const dropdown = dropdownWrapper?.querySelector<HTMLElement>(".select-menu");
            if (!dropdown) return;

            dropdown.innerHTML = "";

            data.forEach((teach) => {
                dropdown.innerHTML += `<li data-value="${teach.id}">${teach.nameSymbol}</li>`;
            });
        })
        .catch((error) => {
            console.error("Error loading all teachers into dropdown: ", error);
        });
}

function loadRooms(): void {
    fetch(`http://localhost:8080/api/rooms`)
        .then((response) => {
            return response.json() as Promise<RoomItem[]>;
        })
        .then((data) => {
            console.log(data);
            const dropdownWrapper = getElement<HTMLElement>("rooms");
            const dropdown = dropdownWrapper?.querySelector<HTMLElement>(".select-menu");
            if (!dropdown) return;

            dropdown.innerHTML = "";

            data.forEach((room) => {
                dropdown.innerHTML += `<li data-value="${room.id}">${room.roomNumber}</li>`;
            });
        })
        .catch((error) => {
            console.error("Error loading all rooms into dropdown: ", error);
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

document.addEventListener("DOMContentLoaded", initializeApp);