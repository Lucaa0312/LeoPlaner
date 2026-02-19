// room types available
const allRoomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
let selectedRoomTypes = [];

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


function initColorSelection() {

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
}



// Initialize the application
function initializeApp() {
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);