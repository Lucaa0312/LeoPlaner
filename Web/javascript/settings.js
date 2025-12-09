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
                <input type="checkbox" id="${subject.subjectName}" name="subject${subject.id}" value="${subject.subjectName}">
                <label for="${subject.subjectName}"> ${subject.subjectName}</label>
                <br><br>`;
        }

        let content = `
        <div>
            <form>
                <label for="teacherName" >Teacher Name:</label>
                <input type="text" id="teacherName" name="teacherName" required>
                <br><br>
                <label for="teacherEmail">Name Symbol:</label>
                <input type="text" id="teacherNameSymbol" name="teacherNameSymbol" required>
                <br><br>
                <label for="teacherSubjects">Subjects:</label>
                ${subjects}
                <input type="submit" value="Add Teacher">
            </form>
        </div>
        `;
        document.getElementById("form").innerHTML = content;
    }).catch(error => {
        console.error('Error fetching subjects:', error);
    });
}