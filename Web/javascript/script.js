let times = [
    "07:05", "07:55", "08:00", "08:50", "08:55",
    "09:45", "10:00", "10:50", "10:55", "11:45",
    "11:50", "12:40", "12:45", "13:35", "13:40",
    "14:30", "14:35", "15:25", "15:30", "16:20",
    "16:25", "17:15", "17:20", "18:05", "18:50",
    "19:00", "19:45", "20:30", "20:40", "21:25",
    "22:10"
];

const daysOfWeek = [
    "Time schedules",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];

let currentDay = "";

let currentTimetableData = [];

function load() {
    fetch("http://localhost:8080/api/timetable")
    .then(response => {
        return response.json();
    }).then(data => {
        currentTimetableData = data.classSubjectInstances;
        data = data.classSubjectInstances;
        console.log(data);

        createLayout(data);
        
    }).catch(error => {
        console.error('Error fetching data:', error);
    });
}

load();

function getRandomizedTimeTable() {
    fetch("http://localhost:8080/api/timetable/randomize")
    .then(response => {
        return response.json();
    }).then(data => {
        data = data.classSubjectInstances;
        console.log(data);

        createLayout(data);

        let daySubjects = {
            "1": new Array(times.length).fill(null),
            "2": new Array(times.length).fill(null),
            "3": new Array(times.length).fill(null),
            "4": new Array(times.length).fill(null),
            "5": new Array(times.length).fill(null),
            "6": new Array(times.length).fill(null)
        };

        function determineSlotIndex(item) {
            try {
                if (item && item.period) {
                    return item.period.schoolHour !== undefined ? item.period.schoolHour - 1 : 0;
                }
            } catch (e) {
                
            }
        }

        // Populate daySubjects with entries from data
        data.forEach((item) => {
            try {
                currentDay = item.period && item.period.schoolDays;
            } catch (error) {
                currentDay = "None";
            }

            let dayIndex = null;
            switch (currentDay) {
                case "MONDAY": dayIndex = 1; break;
                case "TUESDAY": dayIndex = 2; break;
                case "WEDNESDAY": dayIndex = 3; break;
                case "THURSDAY": dayIndex = 4; break;
                case "FRIDAY": dayIndex = 5; break;
                case "SATURDAY": dayIndex = 6; break;
                case "None": dayIndex = null; break;
                default: dayIndex = 0;
            }

            if (dayIndex !== null && dayIndex >= 1 && dayIndex <= 6) {
                let subjectName = "No lesson";
                let teacherSymbol = "-";
                try {
                    subjectName = item.classSubject.subject.subjectName || subjectName;
                    teacherSymbol = item.classSubject.teacher.nameSymbol || teacherSymbol;
                } catch (error) {
                    console.error(error);
                }

                const dayKey = String(dayIndex);
                const slotIndex = determineSlotIndex(item, daySubjects[dayKey]);

                daySubjects[dayKey][slotIndex] = {
                    subjectName,
                    teacherSymbol
                };
            }
        });

        for (let i = 0; i < times.length; i+=2) {
            builder["0"] += `<div class="timeScheduleBoxes"><p class="periodStarted">${times[i]}</p> <p class="periodEnded">${times[i + 1] || ""}</p></div>\n`;
        }

        for (let d = 1; d <= 6; d++) {
            const dayKey = String(d);
            for (let i = 0; i < 16; i++) {
                const slot = daySubjects[dayKey][i];
                if (slot) {
                    builder[dayKey] += `<div class="periodStyling">\n    <p>${slot.subjectName}</p>\n    <p>${slot.teacherSymbol}</p>\n</div>\n`;
                } else {
                    builder[dayKey] += `<div class="periodStyling empty">\n    <p>No lesson</p>\n    <p>-</p>\n</div>\n`;
                }
            }
        }

        for (let index in builder) {
            const box = document.querySelector(`#day${index} .gridBoxDays`);
            box.innerHTML = builder[index];
            
        }
    }).catch(error => {
        console.error('Error randomizing Timetable:', error);
    });
}

function createLayout(data) {
let builder = {
                "0": "", // "Time schedules"
                "1": "", // Monday
                "2": "", // Tuesday
                "3": "", // Wednesday
                "4": "", // Thursday
                "5": "",  // Friday
                "6": "" // Saturday 
            };

            let daySubjects = {
                "1": new Array(times.length).fill(null),
                "2": new Array(times.length).fill(null),
                "3": new Array(times.length).fill(null),
                "4": new Array(times.length).fill(null),
                "5": new Array(times.length).fill(null),
                "6": new Array(times.length).fill(null)
            };

            function determineSlotIndex(item) {
                try {
                    if (item && item.period) {
                        return item.period.schoolHour !== undefined ? item.period.schoolHour - 1 : 0;
                    }
                } catch (e) {

                }
            }

            // Populate daySubjects with entries from data
            data.forEach((item) => {
                try {
                    currentDay = item.period && item.period.schoolDays;
                } catch (error) {
                    currentDay = "None";
                }

                let dayIndex = null;
                switch (currentDay) {
                    case "MONDAY": dayIndex = 1; break;
                    case "TUESDAY": dayIndex = 2; break;
                    case "WEDNESDAY": dayIndex = 3; break;
                    case "THURSDAY": dayIndex = 4; break;
                    case "FRIDAY": dayIndex = 5; break;
                    case "SATURDAY": dayIndex = 6; break;
                    case "None": dayIndex = null; break;
                    default: dayIndex = 0;
                }

                if (dayIndex !== null && dayIndex >= 1 && dayIndex <= 6) {
                    let subjectName = "No lesson";
                    let teacherSymbol = "-";
                    try {
                        subjectName = item.classSubject.subject.subjectName || subjectName;
                        teacherSymbol = item.classSubject.teacher.nameSymbol || teacherSymbol;
                        subjectColorRed = item.classSubject.subject.subjectColor.red || 0;
                        subjectColorGreen = item.classSubject.subject.subjectColor.green || 0;
                        subjectColorBlue = item.classSubject.subject.subjectColor.blue || 0;

                    } catch (error) {
                        console.error(error);
                    }

                    const dayKey = String(dayIndex);
                    const slotIndex = determineSlotIndex(item, daySubjects[dayKey]);

                    // daySubjects[dayKey][slotIndex] = {
                    //     subjectName,
                    //     teacherSymbol,
                    //     subjectColorRed,
                    //     subjectColorGreen,
                    //     subjectColorBlue
                    // };
                    let hours = item.classSubject.weeklyHours || 1;

                    for (let h = 0; h < hours; h++) {
                        daySubjects[dayKey][slotIndex + h] = {
                            subjectName,
                            teacherSymbol,
                            subjectColorRed,
                            subjectColorGreen,
                            subjectColorBlue
                        };
                    }
                }
            });

            for (let i = 0; i < times.length; i+=2) {
                builder["0"] += `<div class="timeScheduleBoxes"><p class="periodStarted">${times[i]}</p> <p class="periodEnded">${times[i + 1] || ""}</p></div>\n`;
            }

            for (let d = 1; d <= 6; d++) {
                const dayKey = String(d);
                for (let i = 0; i < 16; i++) {
                    const slot = daySubjects[dayKey][i];
                    if (slot) {
                        builder[dayKey] += `<div class="periodStyling ${slot.subjectName}" style="border-color: rgb(${slot.subjectColorRed}, ${slot.subjectColorGreen}, ${slot.subjectColorBlue}); background-color: rgb(${slot.subjectColorRed}, ${slot.subjectColorGreen}, ${slot.subjectColorBlue});">\n    <p>${slot.subjectName}</p>\n    <p>${slot.teacherSymbol}</p>\n</div>\n`;
                    } else {
                        builder[dayKey] += `<div class="periodStyling empty"></div>\n`; 
                    }
                }
            }

            for (let index in builder) {
                const box = document.querySelector(`#day${index} .gridBoxDays`);
                box.innerHTML = builder[index];

            }
        
}
