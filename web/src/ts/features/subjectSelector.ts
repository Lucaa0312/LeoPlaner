import { createChip } from "../components/selectedItems.js";
import type { Subject } from "../types/subject.js";

type SubjectSelectorElements = {
    input: HTMLInputElement;
    dropdown: HTMLElement;
    selectedContainer: HTMLElement;
    inputContainer: HTMLElement;
    allSubjects: Subject[];
};

export function initSubjectSelector({
    input,
    dropdown,
    selectedContainer,
    inputContainer,
    allSubjects,
}: SubjectSelectorElements) {
    let selectedSubjects: Subject[] = [];

    function clearDropdown(): void {
        dropdown.replaceChildren();
    }

    function getSelectedSubjects(): Subject[] {
        return selectedSubjects;
    }

    function reset(): void {
        selectedSubjects = [];
        input.value = "";
        clearDropdown();
        selectedContainer.replaceChildren();
    }

    function addSubject(subject: Subject): void {
        const alreadySelected = selectedSubjects.some(
            (selectedSubject) => selectedSubject.id === subject.id
        );

        if (alreadySelected) {
            return;
        }

        selectedSubjects.push(subject);

        const chip = createChip({
            label: subject.subjectSymbol,
            className: "subject-chip",
            onRemove: () => {
                selectedSubjects = selectedSubjects.filter(
                    (selectedSubject) => selectedSubject.id !== subject.id
                );
            },
        });

        selectedContainer.appendChild(chip);
    }

    function restore(subject: Subject): void {
        addSubject(subject);
    }

    function showMatchingSubjects(): void {
        const query = input.value.toLowerCase().trim();
        clearDropdown();

        if (query === "") {
            return;
        }

        const matches = allSubjects.filter((subject) => {
            const matchesQuery = subject.subjectName.toLowerCase().includes(query);
            const alreadySelected = selectedSubjects.some(
                (selectedSubject) => selectedSubject.id === subject.id
            );

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
        const target = event.target as Element | null;

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