function loadSubjects() {
    fetch("http://localhost:8080/api/subjects")
        .then(response => {
            return response.json();
        }).then(data => {
            console.log(data);

            let subjects = ``;
            for (let i = 0; i < data.length; i++) {
                let subject = data[i];
                subjects += `
                <div class="subject-box">
                    <input type="checkbox" id="${subject.subjectName}" name="subject${subject.id}" value="${subject.subjectName}">
                    <label for="${subject.subjectName}"> ${subject.subjectName}</label>   
                </div>`;
            }

            let content = `
            <form>
                <label for="teacherName" >Teacher Name:</label>
                <input type="text" id="teacherName" name="teacherName" required>
                <br><br>
                <label for="teacherEmail">Name Symbol:</label>
                <input type="text" id="teacherNameSymbol" name="teacherNameSymbol" required>
                <br><br>
                <label for="teacherSubjects">Subjects:</label>
                <div id="checkbox-wrapper">
                    ${subjects}
                </div>
                
                <input type="submit" id="add-teacher-btn" value="Add Teacher">
            </form>
        `;
            document.getElementById("form").innerHTML = content;
        }).catch(error => {
            console.error('Error fetching subjects:', error);
        });
}