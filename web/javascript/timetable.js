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
let breakAfterPeriod = 2;

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
    fetch("http://localhost:8080/api/timetable")
        .then(response => {
            return response.json()
        }).then(data => {
            createLayout(data.classSubjectInstances)
        }).catch(error => {
            console.error('Error loading Timetable:', error)
        })
}


function getRandomizedTimeTable() {
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
    fetch(`http://localhost:8080/api/timetable/getByTeacher/${teacherId}`)
        .then(response => {
            return response.json()
        }).then(data => {
            console.log(data)
            
            createLayout(data.timetableDTO.classSubjectInstances)

        }).catch(error => {
            console.error('Error loading Timetable by teacher:', error)
        })
}

function clearChoice() {
    this.window.location.href = "./timetable.html";
    load();
}

//Load all Times and hours into the table view
function createLayout(data) {
    clearLayout()
    console.log('Raw data:', data)
    let map = new Map()

    // Note: Data will not follow any particular order
    data.forEach(item => {
        if (!map.has(item.period.schoolDays)) {
            map.set(item.period.schoolDays, [])
        }
        map.get(item.period.schoolDays).push(item)
    });

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
        <p class="current-period">${i}. EH</p>
        <p class="period-ended">${times[i + 1] || ""}</p>
        </div>\n`;

        linePlacer += `<div class="period-line"></div>\n`;

    }

    document.getElementById("timetable-times").innerHTML = timesBuilder;
    document.getElementById("timetable-background").innerHTML = linePlacer;

    // value, key
    map.forEach((classSubjects, day) => {

        const gridBox = document.getElementById(day).querySelector(".periods");

        gridBox.innerHTML = "";

        //TODO IT IS NOT POSSIBLE TO TRACK WHEN A BREAK IS SOPOSED TO BE INSERTED
        let itemCount = 0;

        // Create HTML 
        classSubjects.forEach(item => {
            const subjectName = item.classSubject?.subject?.subjectName || "No lesson";
            const teacherSymbol = item.classSubject?.teacher?.nameSymbol || "-";
            const duration = item.duration || 1;
            const subjectColorRed = item.classSubject?.subject?.subjectColor?.red || 200;
            const subjectColorGreen = item.classSubject?.subject?.subjectColor?.green || 200;
            const subjectColorBlue = item.classSubject?.subject?.subjectColor?.blue || 200;

            if (itemCount == breakAfterPeriod) {
                gridBox.innerHTML += `<div class="period-break"></div>\n`;
            }
            
            itemCount++;

            for (let d = 0; d < duration; d++) {
                if (subjectName != "No lesson") {
                    gridBox.innerHTML += `
                    <div class="period-styling" style="background-color: rgb(${subjectColorRed}, ${subjectColorGreen}, ${subjectColorBlue});">
                        <p>${subjectName}</p>
                        <p>${teacherSymbol}</p>
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
            currentPeriod += duration

        });
        gridBox.innerHTML = content;
    });
}

function clearLayout(){
    let days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    days.forEach(day => {
        const gridBox = document.getElementById(day).querySelector(".gridBoxDays");
        gridBox.innerHTML = "";
    });
}

function initializeApp() {
    load();
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);