import initNavbar from "./navbar.js";
import { fetchSubjects, createSubject } from "../api/subjectApi.js";
import { getElement } from "../utils/elementHelpers.js";
import { openPopup, closePopup } from "../components/popup.js";
import { toggleEmptyState } from "../components/emptyState.js";
import { initRoomTypeSelector } from "../features/roomTypeSelector.js";
import { initColorPicker } from "../features/colorSelector.js";
import { initSearchElement } from "../features/searchElement.js";
function formatSubjectName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
function createRoomTypesElement(roomTypes) {
    if (roomTypes.length === 0) {
        return document.createElement("div");
    }
    const roomTypesElement = document.createElement("p");
    roomTypesElement.className = "room-types";
    roomTypesElement.innerHTML = roomTypes.join("<br>");
    return roomTypesElement;
}
function createSubjectCard(subject) {
    const subjectBox = document.createElement("div");
    subjectBox.className = "subject-box";
    const subjectInfo = document.createElement("div");
    subjectInfo.className = "subject-info";
    const subjectName = document.createElement("h2");
    subjectName.className = "subject-name";
    subjectName.textContent = formatSubjectName(subject.subjectName);
    const requiredRoomTypes = createRoomTypesElement(subject.requiredRoomTypes);
    const editDiv = document.createElement("div");
    editDiv.className = "subject-edit";
    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
    subjectInfo.append(subjectName);
    if (subject.requiredRoomTypes.length > 0) {
        subjectInfo.append(requiredRoomTypes);
    }
    subjectBox.append(subjectInfo, editDiv);
    subjectBox.style.backgroundColor = `rgba(${subject.subjectColor.red}, ${subject.subjectColor.green}, ${subject.subjectColor.blue}, 0.5)`;
    return subjectBox;
}
async function loadAndRenderSubjects() {
    const noSubjectsElement = getElement("no-subjects");
    const subjectsContainer = getElement("display-subjects");
    if (!noSubjectsElement || !subjectsContainer) {
        return;
    }
    try {
        const subjects = await fetchSubjects();
        toggleEmptyState(noSubjectsElement, subjects.length > 0);
        subjectsContainer.replaceChildren();
        if (subjects.length === 0) {
            return;
        }
        const gridContainer = document.createElement("div");
        gridContainer.className = "grid-layout";
        for (const subject of subjects) {
            gridContainer.appendChild(createSubjectCard(subject));
        }
        subjectsContainer.appendChild(gridContainer);
    }
    catch (error) {
        console.error("Fehler beim Laden der Fächer:", error);
    }
}
function collectSubjectData(selectetRoomTypes, selectedSubjectColor) {
    const nameInput = getElement("name-input");
    const colorPicker = getElement("color-picker");
    if (!nameInput || !colorPicker) {
        throw new Error("Fehlende Formularelemente");
    }
    return {
        subjectName: nameInput.value.trim(),
        requiredRoomTypes: selectetRoomTypes,
        subjectColor: selectedSubjectColor,
    };
}
function buildAddSubjectFormContent() {
    const container = document.createElement("div");
    container.id = "subject-modal-content";
    container.innerHTML = `
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
    return container;
}
function openAddSubjectForm() {
    const noSubjectsElement = getElement("no-subjects");
    const disableOverlay = getElement("disable-overlay");
    const displaySubjects = getElement("display-subjects");
    const addSubjectScreen = getElement("add-subject-screen");
    if (!addSubjectScreen || !disableOverlay || !displaySubjects) {
        return;
    }
    if (noSubjectsElement)
        noSubjectsElement.style.display = "none";
    openPopup({ modal: addSubjectScreen, overlay: disableOverlay, scrollContainer: displaySubjects });
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-subject-header-container";
    const title = document.createElement("h1");
    title.id = "add-subject-header";
    title.textContent = "Ein neues Fach hinzufügen";
    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-subject-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;
    closeScreenButton.addEventListener("click", () => {
        closePopup({
            modal: addSubjectScreen,
            overlay: disableOverlay,
            scrollContainer: displaySubjects,
        });
    });
    const formContent = buildAddSubjectFormContent();
    const colorPickerContainer = document.createElement("div");
    colorPickerContainer.id = "color-selection-container";
    const confirmButton = document.createElement("div");
    confirmButton.id = "confirm-subject-btn";
    confirmButton.textContent = "Bestätigen";
    headerContainer.append(title, closeScreenButton);
    addSubjectScreen.replaceChildren(headerContainer, formContent, colorPickerContainer, confirmButton);
    const selectorInput = getElement("roomtype-input");
    const selectorDropdown = getElement("roomtype-dropdown");
    const selectedContainer = getElement("selected-roomtypes");
    const inputContainer = getElement("roomtype-input-container");
    if (!selectorInput || !selectorDropdown || !selectedContainer || !inputContainer) {
        return;
    }
    const roomTypeSelector = initRoomTypeSelector({
        input: selectorInput,
        dropdown: selectorDropdown,
        selectedContainer,
        inputContainer,
    });
    const colorPicker = initColorPicker(colorPickerContainer);
    confirmButton.addEventListener("click", async () => {
        try {
            const subjectData = collectSubjectData(roomTypeSelector.getSelectedTypes(), colorPicker.getSelectedColor());
            if (!subjectData) {
                return;
            }
            await createSubject(subjectData);
            closePopup({
                modal: addSubjectScreen,
                overlay: disableOverlay,
                scrollContainer: displaySubjects,
            });
            await loadAndRenderSubjects();
        }
        catch (error) {
            console.error("Error occurred while confirming subject data:", error);
        }
    });
}
function initializeApp() {
    initNavbar();
    void loadAndRenderSubjects();
    const addBtn = getElement("add-btn");
    addBtn?.addEventListener("click", openAddSubjectForm);
    const inputField = getElement("input-field");
    inputField?.addEventListener("input", () => {
        initSearchElement({
            inputId: "input-field",
            selectedRow: ".subject-box",
            values: [".subject-name", ".room-types"],
        });
    });
}
document.addEventListener("DOMContentLoaded", initializeApp);
