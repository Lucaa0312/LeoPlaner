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

    headerContainer.appendChild(closeScreenButton);

    addTeacherScreen.replaceChildren(headerContainer);
}


function initializeApp() {
    initNavbar();
}

document.addEventListener("DOMContentLoaded", initializeApp);
