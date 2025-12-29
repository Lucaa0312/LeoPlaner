// JavaScript for Timetable Page

let times = [
    "07:05", "07:55", "08:00", "08:50", "08:55",
    "09:45", "10:00", "10:50", "10:55", "11:45",
    "11:50", "12:40", "12:45", "13:35", "13:40",
    "14:30", "14:35", "15:25", "15:30", "16:20",
    "16:25", "17:15", "17:20", "18:05", "18:50",
    "19:00", "19:45", "20:30", "20:40", "21:25",
    "22:10"
]

let currentDay = ""

let currentTimetableData = []

function load() {
    fetch("http://localhost:8080/api/timetable")
    .then(response => {
        return response.json()
    }).then(data => {
        currentTimetableData = data.classSubjectInstances
        data = data.classSubjectInstances
        createLayout(data)
        
    }).catch(error => {
        console.error('Error fetching data:', error)
    })
}

load()

function getRandomizedTimeTable() {
    fetch("http://localhost:8080/api/timetable/randomize")
    .then(response => {
        return response.json()
    }).then(data => {
        data = data.classSubjectInstances
        createLayout(data)

    }).catch(error => {
        console.error('Error randomizing Timetable:', error)
    })
}

function getOptimizedTimetable() {
    fetch("http://localhost:8080/api/run/algorithm")
    .then(response => {
        return response.json()
    }).then(data => {
        data = data.classSubjectInstances
        createLayout(data)

    }).catch(error => {
        console.error('Error optimizing Timetable:', error)
    })
}

function createLayout(data) {
    console.log('Raw data:', data)

    // Create and fill map

    let map = new Map()

    let arrayMon = []
    let arrayTue = []
    let arrayWed = []
    let arrayThu = []
    let arrayFri = []
    let arraySat = []

    data.forEach(item => {
        switch (item.period.schoolDays) {
            case "MONDAY":
                arrayMon.push(item)
                break
            case "TUESDAY":
                arrayTue.push(item)
                break
            case "WEDNESDAY":
                arrayWed.push(item)
                break
            case "THURSDAY":
                arrayThu.push(item)
                break
            case "FRIDAY":
                arrayFri.push(item)
                break
            case "SATURDAY":
                arraySat.push(item)
                break
        }
    });

    // Key: Day, Value: array of classSubjects
    map.set("MONDAY", arrayMon)
    map.set("TUESDAY", arrayTue)
    map.set("WEDNESDAY", arrayWed)
    map.set("THURSDAY", arrayThu)
    map.set("FRIDAY", arrayFri)
    map.set("SATURDAY", arraySat)
    console.log('Map:', map)

    let timesBuilder = ``

    for (let i = 0; i < times.length; i+=2) {
            timesBuilder += `<div class="timeScheduleBoxes"><p class="periodStarted">${times[i]}</p> <p class="periodEnded">${times[i + 1] || ""}</p></div>\n`;
        }

    document.getElementById("day0").querySelector(".gridBoxDays").innerHTML = timesBuilder
    
    // value, key
    map.forEach((classSubjects, day) => {

    const dayId = `day${getDayId(day)}`; 
    const gridBox = document.getElementById(dayId).querySelector(".gridBoxDays");
    
    gridBox.innerHTML = ""; 

    // Create HTML 
    classSubjects.forEach(item => {
        const subjectName = item.classSubject?.subject?.subjectName || "No lesson";
        const teacherSymbol = item.classSubject?.teacher?.nameSymbol || "-";
        const duration = item.duration || 1; 
        const subjectColorRed = item.classSubject?.subject?.subjectColor?.red || 200;
        const subjectColorGreen = item.classSubject?.subject?.subjectColor?.green || 200;
        const subjectColorBlue = item.classSubject?.subject?.subjectColor?.blue || 200;

        for (let d = 0; d < duration; d++) {
            gridBox.innerHTML += `
                <div class="periodStyling" style="background-color: rgb(${subjectColorRed}, ${subjectColorGreen}, ${subjectColorBlue});">
                    <p>${subjectName}</p>
                    <p>${teacherSymbol}</p>
                </div>
            `;
        }

    });
});

// Helper function to convert day name to its corresponding ID
function getDayId(day) {
    switch(day) {
        case "MONDAY": return 1;
        case "TUESDAY": return 2;
        case "WEDNESDAY": return 3;
        case "THURSDAY": return 4;
        case "FRIDAY": return 5;
        case "SATURDAY": return 6;
        default: return 0; // Should never happen
        }
    }

}


/* Here is the code for preventing overlapping entries and filling the timetable correctly, if needed later
- should be fixed in the backend though

// Wir suchen den ersten freien Startpunkt, der genug Platz hat
                    function findFreeStartIndex(arr, startIndex, duration) {

                        let i = startIndex;

                        while (i < arr.length) {
                            let blockFree = true;

                            for (let d = 0; d < duration; d++) {
                                if (arr[i + d] !== null || i + d >= arr.length) {
                                    blockFree = false;
                                    break;
                                }
                            }

                            if (blockFree) return i;

                            i++; // Stunde weiter nach unten schieben
                        }

                        return -1; 
                    }

                    let freeStart = findFreeStartIndex(daySubjects[dayKey], slotIndex, duration);

                    if (freeStart === -1) {
                        console.warn("KEIN PLATZ GEFUNDEN für:", subjectName, "am Tag", dayKey);
                    } else {
                        for (let h = 0; h < duration; h++) {
                            daySubjects[dayKey][freeStart + h] = {
                                subjectName,
                                teacherSymbol,
                                subjectColorRed,
                                subjectColorGreen,
                                subjectColorBlue
                            };
                        }
                    }
 
*/
