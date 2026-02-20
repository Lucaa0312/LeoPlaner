// Dopdown button trigger

document.querySelectorAll('.top-bar-select').forEach(wrapper => {
    const trigger = wrapper.querySelector('.select-trigger');
    const menu = wrapper.querySelector('.select-menu');

    if (!trigger || !menu) return;

    trigger.addEventListener('click', () => {
        wrapper.classList.toggle('is-open');
    });

    // click on dropbox item
    menu.addEventListener('click', event => {
        const li = event.target.closest('li');
        if (!li) return;

        const previouslySelected = menu.querySelector('.selected-item');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected-item');
        }

        wrapper.classList.remove('is-open');
        li.classList.add('selected-item');

        const data = li.dataset.value;
        const selectedCategory = wrapper.id;
        if (selectedCategory === 'teachers') {
            getTimetableByTeacher(data);
        }

        if (selectedCategory === 'classes') {
            getTimetableByClass(data);
        }

        if (selectedCategory === 'rooms') {
            getTimetableByRoom(data);
        }
        // Add more conditions HERE
    });
});

// click out of box closes dropdown
document.addEventListener('click', event => {
    const isClickInside = event.target.closest('.top-bar-select');
    if (isClickInside) return;

    document.querySelectorAll('.top-bar-select').forEach(wrapper => {
        wrapper.classList.remove('is-open');
    });
});

// JavaScript for Timetable Page
let breakAfterPeriod = 3;

const times = [
    "07:05", "07:55", "08:00", "08:50", "08:55",
    "09:45", "10:00", "10:50", "10:55", "11:45",
    "11:50", "12:40", "12:45", "13:35", "13:40",
    "14:30", "14:35", "15:25", "15:30", "16:20",
    "16:25", "17:15", "17:20", "18:05", "18:50",
    "19:00", "19:45", "20:30", "20:40", "21:25",
    "22:10"
]

/* Doesn't work yet
function init() {
    fetch("http://localhost:8080/api/run/testCsv")
}
*/

function load() {
    clearLayout();
    fetch("http://localhost:8080/api/timetable/getByClass/1")
        .then(response => {
            return response.json()
        }).then(data => {
            createLayout(data.classSubjectInstances)
        }).catch(error => {
            console.error('Error loading Timetable:', error)
        });
}

function getRandomizedTimeTable() {
    clearLayout();
    fetch("http://localhost:8080/api/timetable/randomize")
        .then(response => {
            return response.json()
        }).then(data => {
            createLayout(data.classSubjectInstances)
        }).catch(error => {
            console.error('Error randomizing Timetable:', error)
        })
}

function getOptimizedTimetable() {
    clearLayout();
    fetch("http://localhost:8080/api/run/algorithm")
        .then(response => {
            return response.json()
        }).then(data => {
            createLayout(data.classSubjectInstances)
        }).catch(error => {
            console.error('Error optimizing Timetable:', error)
        })
}

function getTimetableByTeacher(teacherId) {
    clearLayout();
    fetch(`http://localhost:8080/api/timetable/getByTeacher/${teacherId}`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(`Fetched data:`, data)
            createLayout(data.classSubjectInstances)
            createRedArea(data.teacher);
        }).catch(error => {
            console.error('Error loading Timetable by teacher:', error)
        })
}

function getTimetableByClass(classId) {
    fetch(`http://localhost:8080/api/timetable/getByClass/${classId}`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(data)

            createLayout(data.classSubjectInstances)

        }).catch(error => {
            console.error('Error loading Timetable by class:', error)
        })
}

function getTimetableByRoom(roomId) {
    fetch(`http://localhost:8080/api/timetable/getByRoom/${roomId}`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(data)

            createLayout(data.classSubjectInstances)

        }).catch(error => {
            console.error('Error loading Timetable by room:', error)
        })
}

function clearChoice() {
    this.window.location.href = "./timetable.html";
    load();
}

function createRedArea(teacher) {
    console.log("Teacher data:", teacher);
    const noWorkingHours = [];

    for (let i = 0; i < teacher.teacherNonWorkingHours.length; i++) {
        noWorkingHours.push({
            classSubject: {
                subject: {
                    id: 2,
                    subjectName: "RedArea",
                    subjectColor: { red: 255, green: 1, blue: 1 }
                },
                teacher: {
                    id: teacher.id,
                    teacherName: teacher.teacherName,
                    nameSymbol: teacher.nameSymbol
                }
            },
            period: {
                schoolDays: teacher.teacherNonWorkingHours[i].day,
                schoolHour: teacher.teacherNonWorkingHours[i].schoolHour,
                lunchBreak: false
            }
        });
    }

    console.log("No working hours:", noWorkingHours);
    createLayout(noWorkingHours);
}


function createLayout(data) {
    console.log('Raw data:', data)
    let map = new Map()

    // Note: Data will not follow any particular order
    data.forEach(item => {
        if (!map.has(item.period.schoolDays)) {
            map.set(item.period.schoolDays, [])
        }
        map.get(item.period.schoolDays).push(item)
    });

    for (const [day, entries] of map) {
        entries.sort((a, b) =>
            a.period.schoolHour - b.period.schoolHour
        );
    }

    console.log('Map:', map)
    let timesBuilder = ``;
    let linePlacer = ``;

    //load period start and end time
    for (let i = 0; i < times.length; i += 2) {
        if (i == breakAfterPeriod * 2) {
            timesBuilder += `<div class="break-box"></div>\n`;

            linePlacer += `<div class="break-line"></div>\n`;
        }

        timesBuilder += `<div class="period-box">
        <p class="period-started">${times[i]}</p>
        <p class="current-period">${i/2}. EH</p>
        <p class="period-ended">${times[i + 1] || ""}</p>
        </div>\n`;

        linePlacer += `<div class="period-line"></div>\n`;

    }

    document.getElementById("timetable-times").innerHTML = timesBuilder;
    document.getElementById("timetable-background").innerHTML = linePlacer;

    // value, key
    map.forEach((classSubjects, day) => {
        let content = ``;
        const gridBox = document.getElementById(day).querySelector(".periods");

        gridBox.innerHTML = "";

        let currentPeriod = 0;

        // Create HTML 
        classSubjects.forEach(item => {
            const subjectName = item.classSubject?.subject?.subjectName || "No lesson";
            const teacherSymbol = item.classSubject?.teacher?.nameSymbol || "-";
            const duration = item.duration || 1;

            // WARNING: Will overwrite 0 rgb values, so choose 1
            // e.g. red = rgb(255, 1, 1) instead of rgb(255, 0, 0)
            const subjectColorRed = item.classSubject?.subject?.subjectColor?.red || 200;
            const subjectColorGreen = item.classSubject?.subject?.subjectColor?.green || 200;
            const subjectColorBlue = item.classSubject?.subject?.subjectColor?.blue || 200;
            const period = item.period.schoolHour

            // Fill empty periods
            while (currentPeriod < period) {
                content += `<div class="period-styling"></div>`
                currentPeriod++
            }

            for (let d = 0; d < duration; d++) {
                if (subjectName !== "No lesson" && subjectName !== "RedArea") {
                    content += `
                    <div class="period-styling" style="background-color: rgb(${subjectColorRed}, ${subjectColorGreen}, ${subjectColorBlue});">
                        <p>${subjectName}</p>
                        <p>${teacherSymbol}</p>
                    </div>
                `;
                }
                else if (subjectName === "RedArea") {
                    content += `
                    <div class="period-styling" style="background-color: rgb(${subjectColorRed}, ${subjectColorGreen}, ${subjectColorBlue});">
                        <p> No working hour</p>
                    </div>
                `;
                }
                else {
                    gridBox.innerHTML += `
                    <div class="period-styling">
                    </div>
                `;
                }
            }
            currentPeriod += duration;
        });
        gridBox.innerHTML = content;
    });
}

function clearLayout() {
    let days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    days.forEach(day => {
        const gridBox = document.getElementById(day).querySelector(".periods");
        gridBox.innerHTML = "";
    });

    loadClasses();
    loadTeachers();
    loadRooms();
}

function loadClasses() {
    fetch(`http://localhost:8080/api/getAllClasses`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(data)
            const dorpdown = document.getElementById('classes').querySelector('.select-menu');

            data.forEach(clazz => {
                dorpdown.innerHTML += `<li data-value="${clazz.id}">${clazz.className}</li>`;
            });

        }).catch(error => {
            console.error('Error loading all classes into dropdown: ', error)
        });
}

function loadTeachers() {
    fetch(`http://localhost:8080/api/teachers`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(data)
            const dorpdown = document.getElementById('teachers').querySelector('.select-menu');

            data.forEach(teach => {
                dorpdown.innerHTML += `<li data-value="${teach.id}">${teach.nameSymbol}</li>`;
            });

        }).catch(error => {
            console.error('Error loading all teachers into dropdown: ', error)
        });
}

function loadRooms() {
    fetch(`http://localhost:8080/api/rooms`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(data)
            const dorpdown = document.getElementById('rooms').querySelector('.select-menu');

            data.forEach(room => {
                dorpdown.innerHTML += `<li data-value="${room.id}">${room.roomNumber}</li>`;
            });

        }).catch(error => {
            console.error('Error loading all rooms into dropdown: ', error)
        });
}

function initializeApp() {
    load();
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);
