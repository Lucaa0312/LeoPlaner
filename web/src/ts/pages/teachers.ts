import initNavbar from "./navbar.js";
import type { CreateTeacherRequest, Teacher, TeacherFormState, TeacherFormStep} from "../types/teacher.js";
import { createTeacher, fetchTeachers } from "../api/teacherApi.js";
import { toggleEmptyState } from "../components/emptyState.js";
import { getElement, aquireElement } from "../utils/elementHelpers.js";
import { closePopup, openPopup } from "../components/popup.js";
import { imagePreview } from "../features/imagePreview.js";
import type { Subject } from "../types/subject.js";
import { fetchSubjects } from "../api/subjectApi.js";
import { initSubjectSelector } from "../features/subjectSelector.js";

function createTeacherSubjectChips(subjects: Teacher["teachingSubject"]): string {
    const visibleSubjects = subjects.slice(0, 2);
    const hiddenSubjects = subjects.slice(2);
    const remaining = subjects.length - visibleSubjects.length;

    let chips = visibleSubjects
        .map((subject) => `<span class="subject-chip" title="${subject.subjectName}">${subject.subjectName}</span>`)
        .join("");

    if (remaining > 0) {
        chips += `<span class="subject-chip extra">+${remaining}</span>`;
    }

    chips += hiddenSubjects
    .map(subject => `<span class="subject-chip hidden-subject" style="display: none;" title="${subject.subjectName}">${subject.subjectName}</span>`)
    .join("");

    return chips;
}


function showRemainingSubjects(teacherID: number): void {
    const container = document.querySelector(`.teacher-subjects[data-index="${teacherID}"]`) as HTMLElement | null;
    if (!container) return;

    const hiddenChips = container.querySelectorAll(".hidden-subject") as NodeListOf<HTMLElement>;
    hiddenChips.forEach(chip => {
        chip.style.display = "inline-block";
    });

    const extraChip = container.querySelector(".subject-chip.extra") as HTMLElement | null;
    if (extraChip) {
        extraChip.style.display = "none";
    }
}

function closeAllTeachers(): void {
    const allTeacherContainers = document.querySelectorAll(".teacher-subjects") as NodeListOf<HTMLElement>;

    allTeacherContainers.forEach(container => {
        const hiddenChips = container.querySelectorAll(".hidden-subject") as NodeListOf<HTMLElement>;
        hiddenChips.forEach(chip => {
            chip.style.display = "none";
        });

        const extraChip = container.querySelector(".subject-chip.extra") as HTMLElement | null;
        if (extraChip) {
            extraChip.style.display = "inline-block";
        }
    });
}


function createTableInfoRow(): HTMLElement {
    const tableInfo = document.createElement("div");
    tableInfo.id = "table-info";
    
    const nameHeader = document.createElement("p");
    nameHeader.id = "teacher-left-section";
    nameHeader.textContent = "Name";

    const initialsHeader = document.createElement("p");
    initialsHeader.id = "teacher-initials-section";
    initialsHeader.innerHTML = "K&uuml;rzel";

    const subjectsHeader = document.createElement("p");
    subjectsHeader.id = "teacher-subjects-section";
    subjectsHeader.innerHTML = "F&auml;cher";

    const workloadHeader = document.createElement("p");
    workloadHeader.id = "teacher-workload-section";
    workloadHeader.textContent = "Arbeitslast";

    const editHeader = document.createElement("p");
    editHeader.id = "teacher-edit-section";
    editHeader.textContent = "Bearbeiten";

    tableInfo.append(nameHeader, initialsHeader, subjectsHeader, workloadHeader, editHeader);
    return tableInfo;
}

let subjectChipTeacherID = 0;
function createTeacherRow(teacher: Teacher): HTMLElement {
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
    const currentTeacherID = subjectChipTeacherID;
    teacherSubjects.dataset.index = currentTeacherID.toString();
    teacherSubjects.innerHTML = createTeacherSubjectChips(teacher.teachingSubject);
    teacherSubjects.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        
        // Only trigger if the extra chip is clicked, not the individual subject chips
        if (target.classList.contains("extra")) {
            closeAllTeachers();
            showRemainingSubjects(currentTeacherID);
        }
    })
    subjectChipTeacherID++;


    const teacherWorkload = document.createElement("div");
    teacherWorkload.className = "teacher-workload";
    teacherWorkload.textContent = "—";

    const teacherEdit = document.createElement("div");
    teacherEdit.className = "teacher-edit";
    teacherEdit.innerHTML = `<i class="fa-solid fa-pencil"></i>`;


    teacherInfo.appendChild(teacherName);
    teacherLeft.append(avatarPlaceholder, teacherInfo);

    card.append(teacherLeft, teacherInitials, teacherSubjects,teacherWorkload, teacherEdit);
    return card;
}


async function loadAndRenderTeachers(): Promise<void> {
    const noTeachersElement = getElement<HTMLElement>("no-teachers");
    const teachersContainer = getElement<HTMLElement>("display-teachers");
    if (!noTeachersElement || !teachersContainer) return;

    try {
        const teachers = await fetchTeachers();

        toggleEmptyState(noTeachersElement, teachers.length > 0);
        teachersContainer.replaceChildren();

        if (teachers.length === 0) return;

        
        if (!teachersContainer) return;

        const tableInfoRow = createTableInfoRow();
        teachersContainer.appendChild(tableInfoRow);

        teachers.forEach((teacher) => {
            const teacherRow = createTeacherRow(teacher);
            teachersContainer.appendChild(teacherRow);
        });

    }
    catch (error) {
        console.error("Fehler beim Laden der Lehrer: " + error);
    }
}

function formatedNameInput(firstNameId: string, lastNameId: string): string {
    const firstNameInput = getElement<HTMLInputElement>(firstNameId);
    const lastNameInput = getElement<HTMLInputElement>(lastNameId);

    if (!firstNameInput || !lastNameInput) throw new Error("Name input fields not found");

    return firstNameInput.value + " " + lastNameInput.value;
}


function collectTeacherData(selectedSubjects: Subject[]): CreateTeacherRequest {
    const nameInput = formatedNameInput("first-name-input", "last-name-input");
    const initialsInput = getElement<HTMLInputElement>("initials-input");
    
    if (!initialsInput) throw new Error("Initials input not found");

    return {
        teacherName: nameInput,
        nameSymbol: initialsInput.value,
        teachingSubject: selectedSubjects.map((subject) => subject.id)
    };
}

/*
function buildAddTeacherForm(): HTMLElement {
    const formContainer = document.createElement("div");
    formContainer.id = "form-container";

    const addTeacherForm = document.createElement("form");
    addTeacherForm.id = "add-teacher-form";

    const firstNameInput = document.createElement("input");
    firstNameInput.type = "text";
    firstNameInput.id = "first-name-input";
    firstNameInput.name = "first-name";
    firstNameInput.required = true;
    firstNameInput.placeholder = "Vorname";

    const lastNameInput = document.createElement("input");
    lastNameInput.type = "text";
    lastNameInput.id = "last-name-input";
    lastNameInput.name = "last-name";
    lastNameInput.required = true;
    lastNameInput.placeholder = "Nachname";

    const initialsInput = document.createElement("input");
    initialsInput.type = "text";
    initialsInput.id = "initials-input";
    initialsInput.name = "initials";
    initialsInput.required = true;
    initialsInput.placeholder = "Initialen";
    
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.id = "email-input";
    emailInput.name = "email";
    emailInput.required = false;
    emailInput.placeholder = "Email";

    addTeacherForm.append(firstNameInput, lastNameInput, initialsInput, emailInput);
    
    const addSubjectsContainer = document.createElement("div");
    addSubjectsContainer.id = "add-subjects-container";

    const subjectInputContainer = document.createElement("div");
    subjectInputContainer.id = "subject-input-container";

    const subjectInput = document.createElement("input");
    subjectInput.type = "text";
    subjectInput.id = "subject-input";
    subjectInput.placeholder = "Fach hinzufügen";

    const addSubjectImg = document.createElement("img");
    addSubjectImg.id = "add-subject-img";
    addSubjectImg.src = "../assets/img/magnifyingGlass.png";
    addSubjectImg.alt = "Add Subject";

    subjectInputContainer.append(addSubjectImg, subjectInput);

    const subjectDropdown = document.createElement("div");
    subjectDropdown.id = "subject-dropdown";
    
    const selectedSubjectsContainer = document.createElement("div");
    selectedSubjectsContainer.id = "selected-subjects";

    addSubjectsContainer.append(subjectInputContainer, subjectDropdown, selectedSubjectsContainer);

    formContainer.append(addTeacherForm, addSubjectsContainer);

    return formContainer;
}
*/
function buildFormHeader(modal: HTMLElement, overlay: HTMLElement, scrollContainer: HTMLElement): HTMLElement {
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-teacher-header-container";

    const title = document.createElement("h1");
    title.id = "add-teacher-header";
    title.textContent = "Einen neuen Lehrer hinzufügen";

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-teacher-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.addEventListener("click", () => {
        closePopup({
            modal: modal,
            overlay: overlay,
            scrollContainer: scrollContainer
        });
    });
    
    headerContainer.append(title, closeScreenButton);
    return headerContainer;
}


function buildAvatarUploadSection(): HTMLElement {
    const avaterUploadDiv = document.createElement("div");
    avaterUploadDiv.className = "avatar-upload";

    const teacherImageInput = document.createElement("input");
    teacherImageInput.type = "file";
    teacherImageInput.id = "teacher-image-input";
    teacherImageInput.name = "teacher-image";
    teacherImageInput.accept = "image/*";

    const avatarLabel = document.createElement("label");
    avatarLabel.htmlFor = "teacher-image-input";
    avatarLabel.className = "avatar-label";

    const avatarPreview = document.createElement("img");
    avatarPreview.id = "avatar-preview";
    avatarPreview.src = "../assets/img/userPreview.svg";
    avatarPreview.alt = "Upload Photo";

    const avatarText = document.createElement("p");
    avatarText.textContent = "Profilbild hochladen";

    
    avatarLabel.appendChild(avatarPreview);
    avaterUploadDiv.append(teacherImageInput, avatarLabel, avatarText);
    return avaterUploadDiv;
}

/*
async function openAddTeacherForm(): Promise<void> {
    const noTeachersElement = getElement<HTMLElement>("no-teachers");
    const disableOverlay = getElement<HTMLElement>("disable-overlay");
    const displayTeachers = getElement<HTMLElement>("display-teachers");
    const addTeacherScreen = getElement<HTMLElement>("add-teacher-screen");

    if (!addTeacherScreen || !disableOverlay || !displayTeachers) return;
    if (noTeachersElement) noTeachersElement.style.display = "none";

    openPopup({
        modal: addTeacherScreen,
        overlay: disableOverlay,
        scrollContainer: displayTeachers
    });

    const header = buildFormHeader(addTeacherScreen, disableOverlay, displayTeachers);
    const avaterUploadDiv = buildAvatarUploadSection();

    const form = buildAddTeacherForm();
    
    
    const confirmButton = document.createElement("div");
    confirmButton.id = "submit-teacher-btn";
    confirmButton.textContent = "Bestätigen";


    addTeacherScreen.replaceChildren(header, avaterUploadDiv, form, confirmButton);
    imagePreview();

    const subjectInput = getElement<HTMLInputElement>("subject-input");
    const subjectDropdown = getElement<HTMLElement>("subject-dropdown");
    const selectedContainer = getElement<HTMLElement>("selected-subjects");
    const inputContainer = getElement<HTMLElement>("subject-input-container");
    
    if (!subjectInput || !subjectDropdown || !selectedContainer || !inputContainer) return;
    
    const allSubjects = await fetchSubjects();


    const subjectSelector = initSubjectSelector({
        input: subjectInput,
        dropdown: subjectDropdown,
        selectedContainer: selectedContainer,
        inputContainer: inputContainer,
        allSubjects: allSubjects
    });


    confirmButton.addEventListener("click", async () => {
        try {
            const teacherData = collectTeacherData(subjectSelector.getSelectedSubjects());
            if (!teacherData) return;

            await createTeacher(teacherData);

            closePopup({
                modal: addTeacherScreen,
                overlay: disableOverlay,
                scrollContainer: displayTeachers,
            });

            await loadAndRenderTeachers();


        }catch (error) {
            console.error("Error occurred while confirming teacher data:", error);
        }
    });

}*/

// ─── buildStepIndicator ───────────────────────────────────────────────────────
// Ersetzt: nichts (neu)
// Zeigt die 3 Punkte oben im Modal (active / completed)
 
function buildStepIndicator(currentStep: TeacherFormStep): HTMLElement {
    const container = document.createElement("div");
    container.id = "step-indicator";
 
    const steps = [1, 2, 3] as const;
 
    steps.forEach((step) => {
        const dot = document.createElement("div");
        dot.className = "step-dot";
 
        if (step === currentStep) {
            dot.classList.add("active");
        }
 
        if (step < currentStep) {
            dot.classList.add("completed");
        }
 
        container.appendChild(dot);
    });
 
    return container;
}

 
type NavigationButtonsConfig = {
    showBack: boolean;
    nextLabel: string;
    onBack?: () => void;
    onNext: () => void;
};
 
function buildNavigationButtons(config: NavigationButtonsConfig): HTMLElement {
    const navContainer = document.createElement("div");
    navContainer.id = "wizard-nav";
 
    if (config.showBack && config.onBack) {
        const backButton = document.createElement("div");
        backButton.id = "back-teacher-btn";
        backButton.textContent = "Zurück";
 
        backButton.addEventListener("click", () => {
            config.onBack!();
        });
 
        navContainer.appendChild(backButton);
    }
 
    const nextButton = document.createElement("div");
    nextButton.id = "submit-teacher-btn";
    nextButton.textContent = config.nextLabel;
 
    nextButton.addEventListener("click", () => {
        config.onNext();
    });
 
    navContainer.appendChild(nextButton);
 
    return navContainer;
}
 
 
function buildStep1(state: TeacherFormState): HTMLElement {
    const container = document.createElement("div");
    container.id = "step-1-container";
 
    const addTeacherForm = document.createElement("form");
    addTeacherForm.id = "add-teacher-form";
 
    const firstNameInput = document.createElement("input");
    firstNameInput.type = "text";
    firstNameInput.id = "first-name-input";
    firstNameInput.name = "first-name";
    firstNameInput.required = true;
    firstNameInput.placeholder = "Vorname";
    firstNameInput.value = state.firstName;
 
    const lastNameInput = document.createElement("input");
    lastNameInput.type = "text";
    lastNameInput.id = "last-name-input";
    lastNameInput.name = "last-name";
    lastNameInput.required = true;
    lastNameInput.placeholder = "Nachname";
    lastNameInput.value = state.lastName;
 
    const initialsInput = document.createElement("input");
    initialsInput.type = "text";
    initialsInput.id = "initials-input";
    initialsInput.name = "initials";
    initialsInput.required = true;
    initialsInput.placeholder = "Initialen";
    initialsInput.value = state.nameSymbol;
 
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.id = "email-input";
    emailInput.name = "email";
    emailInput.required = false;
    emailInput.placeholder = "Email";
    emailInput.value = state.email;
 
    addTeacherForm.append(firstNameInput, lastNameInput, initialsInput, emailInput);
    container.appendChild(addTeacherForm);
 
    return container;
}
 

 
async function buildStep2(state: TeacherFormState): Promise<HTMLElement> {
    const container = document.createElement("div");
    container.id = "step-2-container";
 
    const addSubjectsContainer = document.createElement("div");
    addSubjectsContainer.id = "add-subjects-container";
 
    const subjectInputContainer = document.createElement("div");
    subjectInputContainer.id = "subject-input-container";
 
    const addSubjectImg = document.createElement("img");
    addSubjectImg.id = "add-subject-img";
    addSubjectImg.src = "../assets/img/magnifyingGlass.png";
    addSubjectImg.alt = "Add Subject";
 
    const subjectInput = document.createElement("input");
    subjectInput.type = "text";
    subjectInput.id = "subject-input";
    subjectInput.placeholder = "Fach hinzufügen";
 
    subjectInputContainer.append(addSubjectImg, subjectInput);
 
    const subjectDropdown = document.createElement("div");
    subjectDropdown.id = "subject-dropdown";
 
    const selectedSubjectsContainer = document.createElement("div");
    selectedSubjectsContainer.id = "selected-subjects";
 
    addSubjectsContainer.append(subjectInputContainer, subjectDropdown, selectedSubjectsContainer);
    container.appendChild(addSubjectsContainer);
 
    const allSubjects = await fetchSubjects();
 
    const subjectSelector = initSubjectSelector({
        input: subjectInput,
        dropdown: subjectDropdown,
        selectedContainer: selectedSubjectsContainer,
        inputContainer: subjectInputContainer,
        allSubjects: allSubjects
    });
 
    // Vorherige Auswahl wiederherstellen wenn man zurücknavigiert
    state.selectedSubjects.forEach((subject) => {
        subjectSelector.restore?.(subject);
    });
 
    // Selector am Container speichern damit saveStep2() ihn lesen kann
    (container as any)._subjectSelector = subjectSelector;
 
    return container;
}
 
 
 
function buildStep3(): HTMLElement {
    const container = document.createElement("div");
    container.id = "step-3-container";
 
    // TODO: ersetzen mit initAvailabilitySelector(...) sobald implementiert
    const placeholder = document.createElement("p");
    placeholder.id = "availability-placeholder";
    placeholder.textContent = "Verfügbarkeit — kommt bald";
 
    container.appendChild(placeholder);
 
    return container;
}
 
 
 
async function openAddTeacherForm(): Promise<void> {
    const noTeachersElement = aquireElement<HTMLElement>("no-teachers");
    const disableOverlay = aquireElement<HTMLElement>("disable-overlay");
    const displayTeachers = aquireElement<HTMLElement>("display-teachers");
    const addTeacherScreen = aquireElement<HTMLElement>("add-teacher-screen");
 
    if (!addTeacherScreen || !disableOverlay || !displayTeachers) return;
    if (noTeachersElement) noTeachersElement.style.display = "none";
 
    openPopup({
        modal: addTeacherScreen,
        overlay: disableOverlay,
        scrollContainer: displayTeachers
    });
 
    const header = buildFormHeader(addTeacherScreen, disableOverlay, displayTeachers);
 
    const state: TeacherFormState = {
        firstName: "",
        lastName: "",
        nameSymbol: "",
        email: "",
        selectedSubjects: [],
    };
 
    let currentStep: TeacherFormStep = 1;
 
    function saveStep1(): void {
        state.firstName = getElement<HTMLInputElement>("first-name-input")?.value.trim() ?? "";
        state.lastName = getElement<HTMLInputElement>("last-name-input")?.value.trim() ?? "";
        state.nameSymbol = getElement<HTMLInputElement>("initials-input")?.value.trim() ?? "";
        state.email = getElement<HTMLInputElement>("email-input")?.value.trim() ?? "";
    }
 
    function saveStep2(stepContainer: HTMLElement): void {
        const selector = (stepContainer as any)._subjectSelector;
 
        if (selector) {
            state.selectedSubjects = selector.getSelectedSubjects();
        }
    }
 
    async function renderStep(): Promise<void> {
        const stepIndicator = buildStepIndicator(currentStep);
 
        if (currentStep === 1) {
            const avaterUploadDiv = buildAvatarUploadSection();
            const stepContent = buildStep1(state);
 
            const nav = buildNavigationButtons({
                showBack: false,
                nextLabel: "Weiter",
                onNext: () => {
                    saveStep1();
                    currentStep = 2;
                    void renderStep();
                }
            });
 
            addTeacherScreen.replaceChildren(header, stepIndicator, avaterUploadDiv, stepContent, nav);
            imagePreview();
 
        } else if (currentStep === 2) {
            const stepContent = await buildStep2(state);
 
            const nav = buildNavigationButtons({
                showBack: true,
                nextLabel: "Weiter",
                onBack: () => {
                    saveStep2(stepContent);
                    currentStep = 1;
                    void renderStep();
                },
                onNext: () => {
                    saveStep2(stepContent);
                    currentStep = 3;
                    void renderStep();
                }
            });
 
            addTeacherScreen.replaceChildren(header, stepIndicator, stepContent, nav);
 
        } else if (currentStep === 3) {
            const stepContent = buildStep3();
 
            const nav = buildNavigationButtons({
                showBack: true,
                nextLabel: "Bestätigen",
                onBack: () => {
                    currentStep = 2;
                    void renderStep();
                },
                onNext: async () => {
                    try {
                        const teacherData = collectTeacherData(state.selectedSubjects);
                        if (!teacherData) return;
 
                        await createTeacher(teacherData);
 
                        closePopup({
                            modal: addTeacherScreen,
                            overlay: disableOverlay,
                            scrollContainer: displayTeachers
                        });
 
                        await loadAndRenderTeachers();
 
                    }
                    catch (error) {
                        console.error("Error occurred while confirming teacher data:", error);
                    }
                }
            });
 
            addTeacherScreen.replaceChildren(header, stepIndicator, stepContent, nav);
        }
    }
 
    await renderStep();
}


function initializeApp() {
    initNavbar();
    void loadAndRenderTeachers();

    const addBtn = getElement<HTMLElement>("add-btn");
    addBtn?.addEventListener("click", openAddTeacherForm);
}

document.addEventListener("DOMContentLoaded", initializeApp);