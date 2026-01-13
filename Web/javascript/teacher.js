// function loadSubjects() {
//   fetch("http://localhost:8080/api/subjects")
//     .then(response => {
//       return response.json();
//     }).then(data => {
//       console.log(data);
//       let subjects = ``;

//       for (let i = 0; i < data.length; i++) {
//         let subject = data[i];
//         subjects += `
//                 <input type="checkbox" id="${subject.subjectName}" name="subject${subject.id}" value="${subject.id}">
//                 <label for="${subject.subjectName}"> ${subject.subjectName}</label>
//                     <br><br>`;
//       }

//       let content = `
//             <div>
//                 <form>
//                     <label for="teacherName" >Teacher Name:</label>
//                     <input type="text" id="teacherName" name="teacherName" required>
//                     <br><br>
//                     <label for="teacherEmail">Name Symbol:</label>
//                     <input type="text" id="teacherNameSymbol" name="teacherNameSymbol" required>
//                     <br><br>
//                     <label for="teacherSubjects">Subjects:</label>
//                     ${subjects}
//                     <input type="button" value="Add Teacher" onclick="addTeacher()">
//                 </form>
//             </div>
//             `;

//       document.getElementById("form").innerHTML = content;
//     }).catch(error => {
//       console.error('Error fetching subjects:', error);
//     });
// }

// function addTeacher() {
//   let teacherName = document.getElementById("teacherName").value;
//   let teacherNameSymbol = document.getElementById("teacherNameSymbol").value;
//   let selectedSubjects = []; document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
//     selectedSubjects.push(parseInt(checkbox.value));
//   });
//   let teacherData = {
//     teacherName: teacherName,
//     nameSymbol: teacherNameSymbol,
//     teachingSubject: selectedSubjects.map(id => ({ id: parseInt(id) }))
//   };
//   fetch("http://localhost:8080/api/teachers", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify(teacherData)
//   }).then(response => {
//     if (response.ok) {
//       alert("Teacher added successfully!");
//       document.querySelector("form").reset();
//     } else {
//       alert("Failed to add teacher.");
//     }
//   }).catch(error => {
//     console.error('Error adding teacher:', error);
//   });
// }


let allSubjects = [];        // all Subjects from DB
let selectedSubjects = [];  // selected Subjects for Teacher

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
    const input = document.getElementById("subject-input");
    const dropdown = document.getElementById("subject-dropdown");

    input.addEventListener("input", () => {
        const query = input.value.toLowerCase();
        dropdown.innerHTML = "";

        if (!query) return;

        const matches = allSubjects.filter(s =>
            s.subjectName.toLowerCase().includes(query) &&
            !selectedSubjects.some(sel => sel.id === s.id)
        );

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

function addSubject(subject) {
    selectedSubjects.push(subject);

    const container = document.getElementById("selected-subjects");

    const chip = document.createElement("div");
    chip.className = "subject-chip";
    chip.innerHTML = `
        ${subject.subjectName}
        <span class="remove-chip">×</span>
    `;

    chip.querySelector(".remove-chip").onclick = () => {
        selectedSubjects = selectedSubjects.filter(s => s.id !== subject.id);
        chip.remove();
    };

    container.appendChild(chip);
}


//add teacher to DB
function addTeacher() {
    const teacherData = {
        teacherName: document.getElementById("first-name-input").value,
        nameSymbol: document.getElementById("initials-input").value,
        teachingSubject: selectedSubjects.map(s => ({ id: s.id }))
    };

    fetch("http://localhost:8080/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherData)
    });
}



function loadAddTeacherForm() {
    
    const disableOverlay = document.getElementById("disable-overlay");
    disableOverlay.style.display = "block";

    const addTeacherScreen = document.getElementById("add-teacher-screen");
    addTeacherScreen.style.display = "flex";
    addTeacherScreen.style.flexDirection = "column";
    if (!addTeacherScreen) return; 

    const headerContainer = document.createElement("div");
    headerContainer.id = "add-teacher-header-container";
    headerContainer.innerHTML = `
      <h1 id="add-teacher-header">Add new Teacher</h1>`;

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-teacher-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        addTeacherScreen.style.display = "none";
        disableOverlay.style.display = "none";
    };

    const formContainer = document.createElement("div");
    formContainer.id = "form-container";
    formContainer.innerHTML = `
      <form id="add-teacher-form">
        
        <div class="avatar-upload">
            <input type="file" id="teacher-image-input" name="teacher-image" accept="image/*"/>
            <label for="teacher-image-input" class="avatar-label">
                <img id="avatar-preview" src="../assets/img/userPreview.svg" alt="Upload Photo"/>
            </label>
            <p>Upload Photo</p>
        </div>
        <br>
        <input type="text" id="first-name-input" name="first-name" required placeholder="First Name">
        <br>
        <input type="text" id="last-name-input" name="last-name" required placeholder="Last Name">
        <br>
        <input type="text" id="initials-input" name="initials" required placeholder="Initials">
        <br>
        <input type="email" id="email-input" name="email" required placeholder="Email">
      </form>

      <div id="add-subjects-container">
        <div id="subject-input-container">
            <input type="text" id="subject-input" placeholder="Add Subject"/>
            <img id="add-subject-img" src="../assets/img/magnifyingGlass.png" alt="Add Subject"/>
        </div>

        <div id="subject-dropdown"></div>
        <div id="selected-subjects"></div>
      </div>
    `;

    headerContainer.appendChild(closeScreenButton);

    addTeacherScreen.replaceChildren(headerContainer, formContainer);

    imagePreview();
    loadSubjects();
    initSubjectSearch();
}


// Image Preview Function
function imagePreview() {
    const input = document.getElementById("teacher-image-input");
    const preview = document.getElementById("avatar-preview");

    input.addEventListener("change", () => {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
        preview.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}


function initializeApp() {
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);
