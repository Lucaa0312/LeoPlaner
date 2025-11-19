function load() {
    let builder = "";
    
    let hour = 7;
    let minute = 5;

    for (let i = 0; i < 18; i++) {

        let timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        builder += `<div id="hour${i}start">${timeStr}</div>`;

        minute += 50;

        

        if (i == 3) {
            minute += 15;
        } else {
            minute += 5;
        }

        if (minute >= 60) {
            hour += Math.floor(minute / 60);
            minute = minute % 60;
        }

    }

    for (let i = 0; i < 5; i++) {
        document.querySelector('.gridBox').innerHTML = builder;
    }
    
}

load();