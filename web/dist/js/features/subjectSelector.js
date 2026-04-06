import { createChip } from "../components/selectedItems.js";
export function initSubjectSelector({ input, dropdown, selectedContainer, inputContainer, allSubjects, }) {
    let selectedSubjects = [];
    function clearDropdown() {
        dropdown.replaceChildren();
    }
    function getSelectedSubjects() {
        return selectedSubjects;
    }
    function reset() {
        selectedSubjects = [];
        input.value = "";
        clearDropdown();
        selectedContainer.replaceChildren();
    }
    function addSubject(subject) {
        const alreadySelected = selectedSubjects.some((selectedSubject) => selectedSubject.id === subject.id);
        if (alreadySelected) {
            return;
        }
        selectedSubjects.push(subject);
        const chip = createChip({
            label: subject.subjectSymbol,
            className: "subject-chip",
            onRemove: () => {
                selectedSubjects = selectedSubjects.filter((selectedSubject) => selectedSubject.id !== subject.id);
            },
        });
        selectedContainer.appendChild(chip);
    }
    function restore(subject) {
        addSubject(subject);
    }
    function showMatchingSubjects() {
        const query = input.value.toLowerCase().trim();
        clearDropdown();
        if (query === "") {
            return;
        }
        const matches = allSubjects.filter((subject) => {
            const matchesQuery = subject.subjectName.toLowerCase().includes(query);
            const alreadySelected = selectedSubjects.some((selectedSubject) => selectedSubject.id === subject.id);
            return matchesQuery && !alreadySelected;
        });
        if (matches.length === 0) {
            const noResult = document.createElement("div");
            noResult.className = "dropdown-item";
            noResult.textContent = "Keine Fächer gefunden";
            dropdown.appendChild(noResult);
            return;
        }
        matches.forEach((subject) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = subject.subjectName;
            item.addEventListener("click", () => {
                addSubject(subject);
                input.value = "";
                clearDropdown();
            });
            dropdown.appendChild(item);
        });
    }
    input.addEventListener("input", showMatchingSubjects);
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!target?.closest(`#${inputContainer.id}`)) {
            clearDropdown();
        }
    });
    return {
        getSelectedSubjects,
        restore,
        reset,
    };
}
