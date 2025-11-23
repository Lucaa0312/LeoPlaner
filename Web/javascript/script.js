  let times = [
        "07:05", 
        "07:55", 
        "08:00",
        "08:50", 
        "08:55",
        "09:45", 
        "10:00",
        "10:50", 
        "10:55",
        "11:45", 
        "11:50",
        "12:40", 
        "12:45",
        "13:35", 
        "13:40",
        "14:30", 
        "14:35",
        "15:25",
        "15:30",
        "16:20", 
        "16:25",
        "17:15", 
        "17:20",
        "18:05",
        "18:50", 
        "19:00",
        "19:45",
        "20:30", 
        "20:40",
        "21:25",
        "22:10"
    ];

let builder = "";
let builderDays = "";
 
function load() {
    fetch("http://localhost:8080/api/classSubjects")
    .then(response => {
        response.json().then(data => {
            console.log(data);
            console.log(data[0].subject);

            for (let i = 0; i < times.length; i++) {
                let subjectName = "";
                let teacherSymbol = "";
                try {
                    subjectName = data[i].subject.subjectName;
                    teacherSymbol = data[i].teacher.nameSymbol;
                }
                catch (error) {
                    subjectName = "No lesson";
                    teacherSymbol = "-";
                }

                builderDays += `<div class="periodStyling">
                <p class="period"> Lesson ${i} </p>
                <p> ${subjectName} </p>
                <p> ${teacherSymbol} </p>
                </div>`;
                builder += `<div id="hour${i}"><p class="periodStarted"> ${times[i]}</p> <p class="periodEnded">${times[i+1] ?? ""}</p></div>`;
            }

            document.querySelectorAll('.gridBox').forEach(box => {
                box.innerHTML = builder;
            });

            document.querySelectorAll('.gridBoxDays').forEach(box => {
                box.innerHTML = builderDays;
            });
            
        });
    })
    .catch(error => {
        // handle the error
    });


   
    
}

load();
