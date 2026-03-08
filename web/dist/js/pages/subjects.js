/*import  initNavbar  from "./navbar.js";

// room types available
const allRoomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
let selectedRoomTypes: string[] = [];
let selectedColorRGB = { red: 222, green: 209, blue: 214 };


// Function to initialize room type search
function initRoomTypeSearch() {
    const input: HTMLInputElement = document.getElementById("roomtype-input") as HTMLInputElement;
    const dropdown: HTMLElement = document.getElementById("roomtype-dropdown") as HTMLElement;

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
        const target = e.target as Element | null;
        if (!target?.closest("#roomtype-input-container")) {
            dropdown.innerHTML = "";
        }
    });
}

// Function to add a room type chip
function addRoomTypeChip(type: string) {
    selectedRoomTypes.push(type);

    const container: HTMLElement | null = document.getElementById("selected-roomtypes") as HTMLElement | null;
    if (!container) return;

    const chip = document.createElement("div");
    chip.className = "roomtype-chip";
    chip.innerHTML = `${type}<span class="remove-chip">&nbsp;&times;</span>`;

    chip.onclick = () => {
        selectedRoomTypes = selectedRoomTypes.filter(t => t !== type);
        chip.remove();
    };

    container.appendChild(chip);
}



// Function to initialize color selection UI (AI optimised code [NOT VIBE CODED! JUST OPTIMISED!])
function initColorSelection() {
    const container: HTMLElement | null = document.getElementById("color-selection-container") as HTMLElement | null;
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

    const canvas: HTMLCanvasElement = document.getElementById("color-wheel") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    const lightness: HTMLInputElement = document.getElementById("lightness") as HTMLInputElement;
    const preview: HTMLElement = document.getElementById("color-preview") as HTMLElement;
    const hexEl: HTMLElement = document.getElementById("color-hex") as HTMLElement;
    const rgbEl: HTMLElement = document.getElementById("color-rgb") as HTMLElement;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 6;

    // state
    let hue = 300;   // 0..360
    let sat = 0.15;  // 0..1
    let lig = 0.85;  // 0..1 (wird vom slider gesteuert)
    let dragging = false;

    function hslToRgb(h: number, s: number, l: number) {
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

    function rgbToHex({red, green, blue}: {red: number; green: number; blue: number}) {
        const to2 = (n: number) => n.toString(16).padStart(2, "0");
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

    function setFromPoint(clientX: number, clientY: number) {
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
        subjectName: (document.getElementById("name-input") as HTMLInputElement)?.value.trim() || "",
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
    selectedRoomTypes = [];

  
    const noSubjects: HTMLElement | null = document.getElementById("no-subjects") as HTMLElement | null;
    if (noSubjects) noSubjects.style.display = "none";

    const disableOverlay: HTMLElement | null = document.getElementById("disable-overlay") as HTMLElement | null;
    if (disableOverlay) disableOverlay.style.display = "block";

    const displaySubjects: HTMLElement | null = document.getElementById("display-subjects") as HTMLElement | null;
    if (displaySubjects) displaySubjects.style.overflowY = "hidden";

    const addSubjectScreen: HTMLElement | null = document.getElementById("add-subject-screen") as HTMLElement | null;
    if (addSubjectScreen) {
        addSubjectScreen.style.display = "flex";
        addSubjectScreen.style.flexDirection = "column";
    }
    if (!addSubjectScreen) return;

    const headerContainer = document.createElement("div");
    headerContainer.id = "add-subject-header-container";
    headerContainer.innerHTML = `
    <h1 id="add-subject-header">Ein neues Fach hinzufügen</h1>`;

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-subject-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        if (displaySubjects) displaySubjects.style.overflowY = "scroll";
        if (addSubjectScreen) addSubjectScreen.style.display = "none";
        if (disableOverlay) disableOverlay.style.display = "none";
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

        if (addSubjectScreen) addSubjectScreen.style.display = "none";
        if (disableOverlay) disableOverlay.style.display = "none";
        if (displaySubjects) displaySubjects.style.overflowY = "scroll";

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
                const noSubjects: HTMLElement | null = document.getElementById("no-subjects") as HTMLElement | null;
                if (noSubjects) noSubjects.style.display = "block";
                return;
            }
            else {
                const noSubjects: HTMLElement | null = document.getElementById("no-subjects") as HTMLElement | null;
                if (noSubjects) noSubjects.style.display = "none";
                const subjectsContainer: HTMLElement | null = document.getElementById("display-subjects") as HTMLElement | null;
                if (!subjectsContainer) return;
                subjectsContainer.innerHTML = "";

                const gridContainer = document.createElement("div");
                gridContainer.className = "grid-layout";

                data.forEach((subject: { subjectName: string; subjectColor: { red: number; green: number; blue: number }; requiredRoomTypes: string[] }) => {
                    const subjectBox = document.createElement("div");
                    subjectBox.className = "subject-box";

                    subjectBox.style.backgroundColor = `rgba(${subject.subjectColor.red}, ${subject.subjectColor.green}, ${subject.subjectColor.blue}, 0.5)`;
                    
                    const subjectInfo = document.createElement("div");
                    subjectInfo.className = "subject-info";
                    subjectInfo.innerHTML = `
                    <div class="subject-info">
                            <h2 class="subject-name">${subject.subjectName.charAt(0).toUpperCase() + subject.subjectName.slice(1).toLowerCase()}</h2>
                    </div>
                    `;

                    if (subject.requiredRoomTypes.length < 1) {

                    }
                    else if (subject.requiredRoomTypes.length > 1) {
                        subjectInfo.innerHTML += `
                            <p class="room-types">${subject.requiredRoomTypes.join("<br>")}</p>
                        `;
                    }
                    else {
                        subjectInfo.innerHTML += `
                            <p class="room-types">${subject.requiredRoomTypes[0]}</p>
                        `;
                    }

                    const editDiv = document.createElement("div");
                    editDiv.className = "subject-edit";
                    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
                    


                    subjectBox.appendChild(subjectInfo);
                    subjectBox.appendChild(editDiv);
                    
                    gridContainer.appendChild(subjectBox);

                    if (subjectsContainer) {
                        subjectsContainer.appendChild(gridContainer);
                    }

                });
                
                const breakDiv = document.createElement("div");
                breakDiv.style.height = "6vh";
                breakDiv.innerHTML = "&nbsp;";

                if (subjectsContainer) {
                    subjectsContainer.appendChild(breakDiv);
                }
            }
        })
        .catch(err => console.error(err));

}


// Search functionality for Subjects
function searchSubjects() {
    let query = (document.getElementById("input-field") as HTMLInputElement)?.value.toLowerCase();
    let rows = document.querySelectorAll(".subject-box");

    rows.forEach(function (row) {
        let name = row.querySelector(".subject-name")?.textContent.toLowerCase();

        if (query === "" || name?.includes(query)) {
            (row as HTMLElement).style.display = "";
        }
        else {
            (row as HTMLElement).style.display = "none";
        }
    });
}



// Initialize the application
function initializeApp() {
    loadSubjects();
    initNavbar();

    const addBtn = document.getElementById("add-btn");
    addBtn?.addEventListener("click", loadAddSubjectForm);
}

document.addEventListener("DOMContentLoaded", initializeApp);
const inputField = document.getElementById("input-field");
if (inputField) {
    inputField.addEventListener("input", searchSubjects);
}*/
import initNavbar from "./navbar.js";
import { fetchSubjects, createSubject } from "../api/subjectApi.js";
import { getElement } from "../utils/elementHelpers.js";
import { openPopup, closePopup } from "../components/popup.js";
import { toggleEmptyState } from "../components/emptyState.js";
import { initRoomTypeSelector } from "../features/roomTypeSelector.js";
import { initColorPicker } from "../features/colorSelector.js";
function formatSubjectName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
function createRoomTypesElement(roomTypes) {
    if (roomTypes.length === 0) {
        return document.createElement("div");
    }
    const roomTypesElement = document.createElement("p");
    roomTypesElement.className = "room-types";
    roomTypesElement.innerHTML = roomTypes.join("<br>");
    return roomTypesElement;
}
function createSubjectCard(subject) {
    const subjectBox = document.createElement("div");
    subjectBox.className = "subject-box";
    const subjectInfo = document.createElement("div");
    subjectInfo.className = "subject-info";
    const subjectName = document.createElement("h2");
    subjectName.className = "subject-name";
    subjectName.textContent = formatSubjectName(subject.subjectName);
    const requiredRoomTypes = createRoomTypesElement(subject.requiredRoomTypes);
    const editDiv = document.createElement("div");
    editDiv.className = "subject-edit";
    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
    subjectInfo.append(subjectName);
    if (subject.requiredRoomTypes.length > 0) {
        subjectInfo.append(requiredRoomTypes);
    }
    subjectBox.append(subjectInfo, editDiv);
    subjectBox.style.backgroundColor = `rgba(${subject.subjectColor.red}, ${subject.subjectColor.green}, ${subject.subjectColor.blue}, 0.5)`;
    return subjectBox;
}
async function loadAndRenderSubjects() {
    const noSubjectsElement = getElement("no-subjects");
    const subjectsContainer = getElement("display-subjects");
    if (!noSubjectsElement || !subjectsContainer) {
        return;
    }
    try {
        const subjects = await fetchSubjects();
        toggleEmptyState(noSubjectsElement, subjects.length > 0);
        subjectsContainer.replaceChildren();
        if (subjects.length === 0) {
            return;
        }
        const gridContainer = document.createElement("div");
        gridContainer.className = "grid-layout";
        for (const subject of subjects) {
            gridContainer.appendChild(createSubjectCard(subject));
        }
        subjectsContainer.appendChild(gridContainer);
    }
    catch (error) {
        console.error("Fehler beim Laden der Fächer:", error);
    }
}
function collectSubjectData(selectetRoomTypes, selectedSubjectColor) {
    const nameInput = getElement("name-input");
    const colorPicker = getElement("color-picker");
    if (!nameInput || !colorPicker) {
        throw new Error("Fehlende Formularelemente");
    }
    return {
        subjectName: nameInput.value.trim(),
        requiredRoomTypes: selectetRoomTypes,
        subjectColor: selectedSubjectColor,
    };
}
function buildAddSubjectFormContent() {
    const container = document.createElement("div");
    container.id = "subject-modal-content";
    container.innerHTML = `
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
    return container;
}
function openAddSubjectForm() {
    const noSubjectsElement = getElement("no-subjects");
    const disableOverlay = getElement("disable-overlay");
    const displaySubjects = getElement("display-subjects");
    const addSubjectScreen = getElement("add-subject-screen");
    if (!addSubjectScreen || !disableOverlay || !displaySubjects) {
        return;
    }
    if (noSubjectsElement)
        noSubjectsElement.style.display = "none";
    openPopup({ modal: addSubjectScreen, overlay: disableOverlay, scrollContainer: displaySubjects });
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-subject-header-container";
    const title = document.createElement("h1");
    title.id = "add-subject-header";
    title.textContent = "Ein neues Fach hinzufügen";
    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-subject-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;
    closeScreenButton.addEventListener("click", () => {
        closePopup({
            modal: addSubjectScreen,
            overlay: disableOverlay,
            scrollContainer: displaySubjects,
        });
    });
    const formContent = buildAddSubjectFormContent();
    const colorPickerContainer = document.createElement("div");
    colorPickerContainer.id = "color-selection-container";
    const confirmButton = document.createElement("div");
    confirmButton.id = "confirm-subject-btn";
    confirmButton.textContent = "Bestätigen";
    headerContainer.append(title, closeScreenButton);
    addSubjectScreen.replaceChildren(headerContainer, formContent, colorPickerContainer, confirmButton);
    const selectorInput = getElement("roomtype-input");
    const selectorDropdown = getElement("roomtype-dropdown");
    const selectedContainer = getElement("selected-roomtypes");
    const inputContainer = getElement("roomtype-input-container");
    if (!selectorInput || !selectorDropdown || !selectedContainer || !inputContainer) {
        return;
    }
    const roomTypeSelector = initRoomTypeSelector({
        input: selectorInput,
        dropdown: selectorDropdown,
        selectedContainer,
        inputContainer,
    });
    const colorPicker = initColorPicker(colorPickerContainer);
    confirmButton.addEventListener("click", async () => {
        try {
            const subjectData = collectSubjectData(roomTypeSelector.getSelectedTypes(), colorPicker.getSelectedColor());
            if (!subjectData) {
                return;
            }
            await createSubject(subjectData);
            closePopup({
                modal: addSubjectScreen,
                overlay: disableOverlay,
                scrollContainer: displaySubjects,
            });
            await loadAndRenderSubjects();
        }
        catch (error) {
            console.error("Error occurred while confirming subject data:", error);
        }
    });
}
function initializeApp() {
    initNavbar();
    void loadAndRenderSubjects();
    const addBtn = getElement("add-btn");
    addBtn?.addEventListener("click", openAddSubjectForm);
    /*
    const inputField = getElement<HTMLInputElement>("input-field");
    inputField?.addEventListener("input", searchRooms);*/
}
document.addEventListener("DOMContentLoaded", initializeApp);
