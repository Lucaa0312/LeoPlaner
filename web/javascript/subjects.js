// room types available
const allRoomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
let selectedRoomTypes = [];
let selectedColorRGB = { red: 222, green: 209, blue: 214 };


// Function to initialize room type search
function initRoomTypeSearch() {
    const input = document.getElementById("roomtype-input");
    const dropdown = document.getElementById("roomtype-dropdown");

    input.addEventListener("input", () => {
        const query = input.value.toUpperCase().trim();
        dropdown.innerHTML = "";

        if (!query) return;

        const matches = allRoomTypes
            .filter(rt => rt.includes(query) && !selectedRoomTypes.includes(rt));

        if (matches.length === 0) {
            dropdown.innerHTML = `<div class="dropdown-item">Keine Raumtypen gefunden</div>`;
            return;
        }

        matches.forEach(rt => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = rt;

            item.onclick = () => {
                addRoomTypeChip(rt);
                dropdown.innerHTML = "";
                input.value = "";
            };

            dropdown.appendChild(item);
        });
    });

   
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#roomtype-input-container")) {
            dropdown.innerHTML = "";
        }
    });
}

// Function to add a room type chip
function addRoomTypeChip(type) {
    selectedRoomTypes.push(type);

    const container = document.getElementById("selected-roomtypes");

    const chip = document.createElement("div");
    chip.className = "roomtype-chip";
    chip.innerHTML = `${type}<span class="remove-chip">&nbsp;&times;</span>`;

    chip.onclick = () => {
        selectedRoomTypes = selectedRoomTypes.filter(t => t !== type);
        chip.remove();
    };

    container.appendChild(chip);
}



// Function to initialize color selection UI (AI optimised code [NOT VIBE CODED THO!])
function initColorSelection() {
    const container = document.getElementById("color-selection-container");
    if (!container) return;

    container.innerHTML = `
      <h2 id="color-title">Wähle eine Farbe aus</h2>

      <div id="color-ui">
        <canvas id="color-wheel" width="220" height="220"></canvas>

        <div id="color-side">
          <div id="color-preview-row">
            <div id="color-preview"></div>
            <div>
              <div id="color-hex">#ded1d6</div>
              <div id="color-rgb">RGB(222, 209, 214)</div>
            </div>
          </div>

          <label id="lightness-label">
            Helligkeit
            <input id="lightness" type="range" min="0" max="100" value="50">
          </label>
        </div>
      </div>
    `;

    const canvas = document.getElementById("color-wheel");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const lightness = document.getElementById("lightness");
    const preview = document.getElementById("color-preview");
    const hexEl = document.getElementById("color-hex");
    const rgbEl = document.getElementById("color-rgb");

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 6;

    // state
    let hue = 300;   // 0..360
    let sat = 0.15;  // 0..1
    let lig = 0.85;  // 0..1 (wird vom slider gesteuert)
    let dragging = false;

    function hslToRgb(h, s, l) {
        // h: 0..360, s/l: 0..1
        h = (h % 360 + 360) % 360;
        const c = (1 - Math.abs(2*l - 1)) * s;
        const x = c * (1 - Math.abs(((h/60) % 2) - 1));
        const m = l - c/2;

        let r1=0,g1=0,b1=0;
        if (h < 60)      [r1,g1,b1] = [c,x,0];
        else if (h < 120)[r1,g1,b1] = [x,c,0];
        else if (h < 180)[r1,g1,b1] = [0,c,x];
        else if (h < 240)[r1,g1,b1] = [0,x,c];
        else if (h < 300)[r1,g1,b1] = [x,0,c];
        else             [r1,g1,b1] = [c,0,x];

        const r = Math.round((r1+m) * 255);
        const g = Math.round((g1+m) * 255);
        const b = Math.round((b1+m) * 255);
        return { red: r, green: g, blue: b };
    }

    function rgbToHex({red, green, blue}) {
        const to2 = n => n.toString(16).padStart(2, "0");
        return `#${to2(red)}${to2(green)}${to2(blue)}`;
    }

    function drawWheel() {
        ctx.clearRect(0,0,canvas.width, canvas.height);

        // Farbrad zeichnen: für jedes Pixel dessen Hue aus Winkel
        const img = ctx.createImageData(canvas.width, canvas.height);
        for (let y=0; y<canvas.height; y++) {
            for (let x=0; x<canvas.width; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const i = (y*canvas.width + x)*4;

                if (dist > radius) {
                    img.data[i+3] = 0;
                    continue;
                }

                const angle = Math.atan2(dy, dx); // -pi..pi
                const h = (angle * 180 / Math.PI + 360) % 360;
                const s = dist / radius;

                const rgb = hslToRgb(h, s, lig);
                img.data[i]   = rgb.red;
                img.data[i+1] = rgb.green;
                img.data[i+2] = rgb.blue;
                img.data[i+3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);

        // Marker zeichnen
        const ang = hue * Math.PI / 180;
        const r = sat * radius;
        const mx = cx + Math.cos(ang) * r;
        const my = cy + Math.sin(ang) * r;

        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI*2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "white";
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,.35)";
        ctx.stroke();
    }

    function setFromPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const clamped = Math.min(dist, radius);

        const angle = Math.atan2(dy, dx);
        hue = (angle * 180 / Math.PI + 360) % 360;
        sat = clamped / radius;

        updateColor();
    }

    function updateColor() {
        lig = Number(lightness.value) / 100; // 0..1

        selectedColorRGB = hslToRgb(hue, sat, lig);

        const hex = rgbToHex(selectedColorRGB);
        preview.style.background = hex;
        hexEl.textContent = hex;
        rgbEl.textContent = `RGB(${selectedColorRGB.red}, ${selectedColorRGB.green}, ${selectedColorRGB.blue})`;

        drawWheel();
    }

    // Events
    canvas.addEventListener("pointerdown", (e) => {
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
        setFromPoint(e.clientX, e.clientY);
    });

    canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        setFromPoint(e.clientX, e.clientY);
    });

    canvas.addEventListener("pointerup", () => dragging = false);
    canvas.addEventListener("pointercancel", () => dragging = false);

    lightness.addEventListener("input", updateColor);

    // initial render
    updateColor();
}


// Function to add a new room
function addSubject() {
    const subjectData = {
        subjectName: document.getElementById("name-input").value,
        requiredRoomTypes: selectedRoomTypes,
        subjectColor: selectedColorRGB
    };

    
  console.log("SENDING", subjectData);

    return fetch("http://localhost:8080/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectData)
    });
}


// Function to load the Add Subject form
function loadAddSubjectForm() {
    selectedSubjectTypes = [];

  
    document.getElementById("no-subjects").style.display = "none";
        
    const disableOverlay = document.getElementById("disable-overlay");
    disableOverlay.style.display = "block";

    const displaySubjects = document.getElementById("display-subjects");
    displaySubjects.style.overflowY = "hidden";

    const addSubjectScreen = document.getElementById("add-subject-screen");
    addSubjectScreen.style.display = "flex";
    addSubjectScreen.style.flexDirection = "column";
    if (!addSubjectScreen) return; 

    const headerContainer = document.createElement("div");
    headerContainer.id = "add-subject-header-container";
    headerContainer.innerHTML = `
    <h1 id="add-subject-header">Ein neues Fach hinzufügen</h1>`;

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-subject-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        displaySubjects.style.overflowY = "scroll";
        addSubjectScreen.style.display = "none";
        disableOverlay.style.display = "none";
    };

    const content = document.createElement("div");
    content.id = "subject-modal-content";
    content.innerHTML = `
        <div class="subject-form-grid">
            <div class="form-name-initials-inputs">
                <input type="text" id="name-input" class="subject-input" placeholder="Name">
                <input type="text" id="initials-input" class="subject-input" placeholder="Abkürzung">
            </div>


            <div id="roomtype-block">
                <div id="roomtype-input-container">
                    <img id="add-room-img" src="../assets/img/magnifyingGlass.png" alt="Add Room"/>
                    <input type="text" id="roomtype-input" placeholder="Benötigter Raum Typ">
                </div>

                <div id="roomtype-dropdown"></div>
                <div id="selected-roomtypes"></div>
            </div>
        </div>
    `;

    
    const colorSelectionContainer = document.createElement("div");
    colorSelectionContainer.id = "color-selection-container";


    const confirmBtn = document.createElement("div");
    confirmBtn.id = "confirm-subject-btn";
    confirmBtn.textContent = "Bestätigen";
    confirmBtn.onclick = () => {
        addSubject();

        addSubjectScreen.style.display = "none";
        disableOverlay.style.display = "none";
        displaySubjects.style.overflowY = "scroll";

        setTimeout(() => {
            loadSubjects();
        }, 500);
    };


    headerContainer.appendChild(closeScreenButton);
    addSubjectScreen.replaceChildren(headerContainer, content, colorSelectionContainer, confirmBtn);

    initRoomTypeSearch();
    initColorSelection();
}


// Fetch and display all subjects
function loadSubjects() {
    fetch("http://localhost:8080/api/subjects")
        .then(res => res.json())
        .then(data => {
            console.log(data);
            if (!data || data.length === 0) {
                console.log("No subjects found");
                document.getElementById("no-subjects").style.display = "block";
                return;
            }
            else {
                document.getElementById("no-subjects").style.display = "none";
                const subjectsContainer = document.getElementById("display-subjects");
                subjectsContainer.innerHTML = "";

                const gridContainer = document.createElement("div");
                gridContainer.className = "grid-layout";

                data.forEach(subject => {
                    const subjectBox = document.createElement("div");
                    subjectBox.className = "subject-box";

                    subjectBox.style.backgroundColor = `rgba(${subject.subjectColor.red}, ${subject.subjectColor.green}, ${subject.subjectColor.blue}, 0.5)`;
                    
                    const subjectInfo = document.createElement("div");
                    subjectInfo.className = "subject-info";
                    subjectInfo.innerHTML = `
                    <div class="subject-info">
                            <h2 class="subject-name"> ${subject.subjectName}</h2>
                    </div>
                    `;

                    if (subject.requiredRoomTypes.length < 1) {

                    }
                    else if (subject.requiredRoomTypes.length > 1) {
                        subjectInfo.innerHTML += `
                            <p class="subject-types">${subject.requiredRoomTypes.join("<br>")}</p>
                        `;
                    }
                    else {
                        subjectInfo.innerHTML += `
                            <p class="subject-types">${subject.requiredRoomTypes[0]}</p>
                        `;
                    }

                    const editDiv = document.createElement("div");
                    editDiv.className = "subject-edit";
                    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
                    


                    subjectBox.appendChild(subjectInfo);
                    subjectBox.appendChild(editDiv);
                    
                    gridContainer.appendChild(subjectBox);

                    subjectsContainer.appendChild(gridContainer);

                }); 
                
                const breakDiv = document.createElement("div");
                breakDiv.style.height = "6vh";
                breakDiv.innerHTML = "&nbsp;";

                subjectsContainer.appendChild(breakDiv);
            }
        })
        .catch(err => console.error(err));

}



// Initialize the application
function initializeApp() {
    loadSubjects();
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);