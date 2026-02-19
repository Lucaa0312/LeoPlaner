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

                let counter = 0;

                const gridContainer = document.createElement("div");
                gridContainer.className = "grid-layout";

                data.forEach(subject => {
                    const subjectBox = document.createElement("div");
                    subjectBox.className = "subject-box";
                    subjectBox.id = `subject-${counter}`;


                    subjectBox.style.backgroundColor = `rgba(${subject.subjectColor.red}, ${subject.subjectColor.green}, ${subject.subjectColor.blue}, 0.5)`;
                    
                    const subjectInfo = document.createElement("div");
                    subjectInfo.className = "subject-info";
                    subjectInfo.innerHTML = `
                    <div class="subject-info">
                            <h2 class="subject-name"> ${subject.subjectName.toUpperCase()}</h2>
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

                    counter++;
                });    
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