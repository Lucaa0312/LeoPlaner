/*import  initNavbar  from "./navbar.js";

let allSubjects: { id: number; subjectName: string }[] = [];        // all Subjects from DB
let selectedSubjects: { id: number; subjectName: string }[] = [];  // selected Subjects for Teacher

//load subjects from DB
function loadSubjects() {
    fetch("http://localhost:8080/api/subjects")
        .then(res => res.json())
        .then(data => {
            allSubjects = data;
        })
        .catch(err => console.error(err));
}


// Initialize subject search functionality
function initSubjectSearch() {
    const input = document.getElementById("subject-input") as HTMLInputElement;
    const dropdown = document.getElementById("subject-dropdown") as HTMLElement;

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();
        dropdown.innerHTML = "";

        if (!query) return;

        const matches = allSubjects.filter(s =>
            s.subjectName.toLowerCase().includes(query) &&
            !selectedSubjects.some(sel => sel.id === s.id)
        );

        if (matches.length === 0) {
            dropdown.innerHTML = `<div class="dropdown-item">No subjects found</div>`;
        }

        matches.forEach(subject => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = subject.subjectName;

            item.onclick = () => {
                addSubject(subject);
                dropdown.innerHTML = "";
                input.value = "";
            };

            dropdown.appendChild(item);
        });
    });
}

// Add subject to selected list

function addSubject(subject: { id: number; subjectName: string }) {
    selectedSubjects.push(subject);

    const container = document.getElementById("selected-subjects") as HTMLElement;

    const chip = document.createElement("div");
    chip.className = "subject-chip";
    chip.innerHTML = `
        ${subject.subjectName}
        <span class="remove-chip">×</span>
    `;

    chip.onclick = () => {
        selectedSubjects = selectedSubjects.filter(s => s.id !== subject.id);
        chip.remove();
    };

    container.appendChild(chip);
}

//add teacher to DB
function addTeacher() {
    const firstNameInput = document.getElementById("first-name-input") as HTMLInputElement;
    const lastNameInput = document.getElementById("last-name-input") as HTMLInputElement;
    const initialsInput = document.getElementById("initials-input") as HTMLInputElement;
    
    if (!firstNameInput || !lastNameInput || !initialsInput) return;
    
    const teacherData = {
        teacherName: firstNameInput.value + " " + lastNameInput.value,
        nameSymbol: initialsInput.value,
        teachingSubject: selectedSubjects.map(s => ({ id: s.id }))
    };

    console.log("SENDING", teacherData);

    fetch("http://localhost:8080/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherData)
    });
}


// Initialize availability day selection
function initAvailabilityDays() {
    const days = document.querySelectorAll("#availability-grid .day");

    days.forEach(day => {
        day.addEventListener("click", () => {
            day.classList.toggle("active");
        });
    });
}

// Image Preview Function
function imagePreview() {
    const input = document.getElementById("teacher-image-input") as HTMLInputElement;
    const preview = document.getElementById("avatar-preview") as HTMLImageElement;

    if (!input || !preview) return;

    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
        preview.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}


function loadAddTeacherForm() {
    const noTeachers = document.getElementById("no-teachers");
    if (noTeachers) noTeachers.style.display = "none";
    
    const disableOverlay: HTMLElement | null = document.getElementById("disable-overlay");
    if (disableOverlay) disableOverlay.style.display = "block";

    const displayTeachers: HTMLElement | null = document.getElementById("display-teachers");
    if (displayTeachers) displayTeachers.style.overflowY = "hidden";
    

    const addTeacherScreen: HTMLElement | null = document.getElementById("add-teacher-screen");
    if (addTeacherScreen) {
        addTeacherScreen.style.display = "flex";
        addTeacherScreen.style.flexDirection = "column";
    }
    if (!addTeacherScreen) return;

    const headerContainer = document.createElement("div");
    headerContainer.id = "add-teacher-header-container";
    headerContainer.innerHTML = `
      <h1 id="add-teacher-header">Einen neuen Lehrer hinzufügen</h1>`;

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-teacher-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        if (displayTeachers) displayTeachers.style.overflowY = "scroll";
        if (addTeacherScreen) addTeacherScreen.style.display = "none";
        if (disableOverlay) disableOverlay.style.display = "none";
        
    };

    
    const avaterUploadDiv = document.createElement("div");
    avaterUploadDiv.className = "avatar-upload";
    avaterUploadDiv.innerHTML = `
        <input type="file" id="teacher-image-input" name="teacher-image" accept="image/*"/>
            <label for="teacher-image-input" class="avatar-label">
                <img id="avatar-preview" src="../assets/img/userPreview.svg" alt="Upload Photo"/>
            </label>
            <p>Profilbild hochladen</p>`;

    

    const formContainer = document.createElement("div");
    formContainer.id = "form-container";
    formContainer.innerHTML = `
      <form id="add-teacher-form">
        
        <input type="text" id="first-name-input" name="first-name" required placeholder="Vorname">
        
        <input type="text" id="last-name-input" name="last-name" required placeholder="Nachname">
        
        <input type="text" id="initials-input" name="initials" required placeholder="Initialen">
        
        <input type="email" id="email-input" name="email" required placeholder="Email">
      </form>

      <div id="add-subjects-container">
        <div id="subject-input-container">
            <input type="text" id="subject-input" placeholder="Fach hinzufügen"/>
            <img id="add-subject-img" src="../assets/img/magnifyingGlass.png" alt="Add Subject"/>
        </div>

        <div id="subject-dropdown"></div>
        <div id="selected-subjects"></div>
      </div>
    `;

    const availabilityContainer = document.createElement("div");
    availabilityContainer.id = "availability-container";
    availabilityContainer.innerHTML = `
        <div id="availability-header">
            <p>Verfügbarkeit:</p>
        </div>
        <div id="availability-grid">
            <div class="day active">Mo</div>
            <div class="day">Di</div>
            <div class="day">Mi</div>
            <div class="day">Do</div>
            <div class="day">Fr</div>
        </div>
    `;

    const submitButton = document.createElement("div");
    submitButton.id = "submit-teacher-btn";
    submitButton.textContent = "Bestätigen";
    submitButton.onclick = () => {
        addTeacher();

        addTeacherScreen.style.display = "none";
        if (disableOverlay) disableOverlay.style.display = "none";
        if (displayTeachers) displayTeachers.style.overflowY = "scroll";

        setTimeout(() => {
            loadTeachers();
        }, 500);
    };


    headerContainer.appendChild(closeScreenButton);

    addTeacherScreen.replaceChildren(headerContainer, avaterUploadDiv, formContainer, availabilityContainer, submitButton);

    initAvailabilityDays();
    imagePreview();
    loadSubjects();
    initSubjectSearch();
}




function loadTeachers() {
    fetch("http://localhost:8080/api/teachers")
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) {
                console.log("No teachers found");
                const noTeachersElement = document.getElementById("no-teachers");
                if (noTeachersElement) noTeachersElement.style.display = "block";
                return;
            }
            else {
                const noTeachersElement = document.getElementById("no-teachers");
                if (noTeachersElement) noTeachersElement.style.display = "none";

                const container = document.getElementById("display-teachers") as HTMLElement;
                if (!container) return;
                
                container.innerHTML = "";

                const tableInfo = document.createElement("div");
                tableInfo.id = "table-info";
                tableInfo.innerHTML = `
                    <p id="teacher-left-section">Name</p>
                    <p id="teacher-initials-section">K&uuml;rzel</p>
                    <p id="teacher-subjects-section">F&auml;cher</p>
                    <p id="teacher-workload-section">Arbeitslast</p>
                    <p id="teacher-edit-section">Bearbeiten</p>
                `;
                container.appendChild(tableInfo);
                
                

                data.forEach((teacher: any) => {
                    const card = document.createElement("div");
                    card.className = "teacher-row";

                    // Subjects anzeigen (max 2 + rest als +X)
                    const subjects = teacher.teachingSubject || [];
                    const visibleSubjects = subjects.slice(0, 2);
                    const remaining = subjects.length - visibleSubjects.length;

                    const subjectsHTML = `
                        ${visibleSubjects.map((s: any) =>
                            `<span class="subject-chip">${s.subjectName}</span>`
                        ).join("")}
                        ${remaining > 0 ? `<span class="subject-chip extra">+${remaining}</span>` : ""}
                    `;

                    card.innerHTML = `
                        <div class="teacher-left">
                            <div class="avatar-placeholder">👤</div>
                            <div class="teacher-info">
                                <div class="teacher-name">${teacher.teacherName}</div>
                            </div>
                        </div>

                        <div class="teacher-initials">${teacher.nameSymbol}</div>

                        <div class="teacher-subjects">
                            ${subjectsHTML}
                        </div>

                        <div class="teacher-workload">
                            ${teacher.workload || "—"}
                        </div>

                        <div class="teacher-edit"><i class="fa-solid fa-pencil"></i></div>
                    `;

                    container.appendChild(card);
                });

                const breakDiv = document.createElement("div");
                breakDiv.style.height = "6vh";
                breakDiv.innerHTML = "&nbsp;";

                container.appendChild(breakDiv);
            }
        })
        .catch(err => {
            console.error(err);
            
        });
}

// Search functionality for teachers
function searchTeacher() {
    const inputField = document.getElementById("input-field") as HTMLInputElement;
    if (!inputField) return;
    
    let query = inputField.value.toLowerCase();
    let rows = document.querySelectorAll(".teacher-row");

    rows.forEach(function (row) {
        const nameElement = row.querySelector(".teacher-name");
        const initialsElement = row.querySelector(".teacher-initials");
        const subjectsElement = row.querySelector(".teacher-subjects");
        
        if (!nameElement || !initialsElement || !subjectsElement) return;
        
        let name = nameElement.textContent?.toLowerCase() || "";
        let initials = initialsElement.textContent?.toLowerCase() || "";
        let subjects = subjectsElement.textContent?.toLowerCase() || "";

        const rowElement = row as HTMLElement;
        if (query === "" || name.includes(query) || initials.includes(query) || subjects.includes(query)) {
            rowElement.style.display = "";
        }
        else {
            rowElement.style.display = "none";
        }
    });
}


function initializeApp() {
    loadTeachers();
    initNavbar();

    const addBtn = document.getElementById("add-btn");
    addBtn?.addEventListener("click", loadAddTeacherForm);
}

document.addEventListener("DOMContentLoaded", initializeApp);

const inputField = document.getElementById("input-field");
if (inputField) {
    inputField.addEventListener("input", searchTeacher);
}
*/
import initNavbar from "../pages/navbar.js";
function createTeacherRow(teacher) {
    const card = document.createElement("div");
    card.className = "teacher-row";
    const teacherLeft = document.createElement("div");
    teacherLeft.className = "teacher-left";
    const avatarPlaceholder = document.createElement("div");
    avatarPlaceholder.className = "avatar-placeholder";
    avatarPlaceholder.textContent = "👤";
    const teacherInfo = document.createElement("div");
    teacherInfo.className = "teacher-info";
    const teacherName = document.createElement("div");
    teacherName.className = "teacher-name";
    teacherName.textContent = teacher.teacherName;
    const teacherInitials = document.createElement("div");
    teacherInitials.className = "teacher-initials";
    teacherInitials.textContent = teacher.nameSymbol;
    const teacherSubjects = document.createElement("div");
    teacherSubjects.className = "teacher-subjects";
    teacherSubjects.innerHTML = teacher.teachingSubject.map(s => `<span class="subject-chip">${s.subjectName}</span>`).join("");
    const teacherWorkload = document.createElement("div");
    teacherWorkload.className = "teacher-workload";
    teacherWorkload.textContent = "—"; // Placeholder, da Arbeitslast nicht im Teacher-Objekt vorhanden ist
    const teacherEdit = document.createElement("div");
    teacherEdit.className = "teacher-edit";
    teacherEdit.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
    teacherInfo.appendChild(teacherName);
    teacherLeft.append(avatarPlaceholder, teacherInfo);
    card.append(teacherLeft, teacherInitials, teacherWorkload, teacherEdit);
    return card;
}
function initializeApp() {
    initNavbar();
}
document.addEventListener("DOMContentLoaded", initializeApp);
