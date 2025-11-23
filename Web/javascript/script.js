function load() {
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
    
    for (let i = 0; i < times.length; i+=2) {
         builder += `<div id="hour${i}">${times[i]}<br><br>${times[i+1] ?? ""}</div>`;
    }

    document.querySelectorAll('.gridBox').forEach(box => {
        box.innerHTML = builder;
    });
}

load();
