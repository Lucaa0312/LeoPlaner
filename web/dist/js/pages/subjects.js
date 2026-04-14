import initNavbar from "./navbar.js";
import { fetchSubjects, createSubject, updateSubject } from "../api/subjectApi.js";
import { getElement, formatName } from "../utils/elementHelpers.js";
import { openPopup, closePopup } from "../components/popup.js";
import { toggleEmptyState } from "../components/emptyState.js";
import { initRoomTypeSelector } from "../features/roomTypeSelector.js";
import { initColorPicker } from "../features/colorSelector.js";
import { initSearchElement } from "../features/searchElement.js";
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
    subjectName.title = subject.subjectName;
    subjectName.textContent = formatName(subject.subjectName);
    const requiredRoomTypes = createRoomTypesElement(subject.requiredRoomTypes);
    const editDiv = document.createElement("div");
    editDiv.className = "subject-edit";
    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
    editDiv.addEventListener("click", () => {
        openEditSubjectForm(subject);
    });
    subjectInfo.append(subjectName);
    if (subject.requiredRoomTypes.length > 0) {
        subjectInfo.append(requiredRoomTypes);
    }
    subjectBox.append(subjectInfo, editDiv);
    subjectBox.style.backgroundColor = `rgba(${subject.subjectColor.red}, ${subject.subjectColor.green}, ${subject.subjectColor.blue}, 0.4)`;
    return subjectBox;
}
function openEditSubjectForm(subject) {
    openSubjectForm(subject);
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
    if (!nameInput) {
        throw new Error("Fehlendes Formularelement");
    }
    return {
        subjectName: nameInput.value.trim(),
        subjectSymbol: nameInput.value.trim().substring(0, 3).toUpperCase(),
        requiredRoomTypes: selectetRoomTypes,
        subjectColor: selectedSubjectColor,
    };
}
function buildAddSubjectFormContent(subject) {
    const container = document.createElement("div");
    container.id = "subject-modal-content";
    const formGrid = document.createElement("div");
    formGrid.className = "subject-form-grid";
    // name / initials block
    const nameInitials = document.createElement("div");
    nameInitials.className = "form-name-initials-inputs";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = "name-input";
    nameInput.className = "subject-input";
    nameInput.placeholder = "Name";
    const initialsInput = document.createElement("input");
    initialsInput.type = "text";
    initialsInput.id = "initials-input";
    initialsInput.className = "subject-input";
    initialsInput.placeholder = "Abkürzung";
    nameInput.value = subject?.subjectName ?? "";
    initialsInput.value = subject?.subjectSymbol ?? "";
    nameInitials.append(nameInput, initialsInput);
    // roomtype block
    const roomtypeBlock = document.createElement("div");
    roomtypeBlock.id = "roomtype-block";
    const roomtypeInputContainer = document.createElement("div");
    roomtypeInputContainer.id = "roomtype-input-container";
    const addRoomImg = document.createElement("img");
    addRoomImg.id = "add-room-img";
    addRoomImg.src = "../assets/img/magnifyingGlass.png";
    addRoomImg.alt = "Add Room";
    const roomtypeInput = document.createElement("input");
    roomtypeInput.type = "text";
    roomtypeInput.id = "roomtype-input";
    roomtypeInput.placeholder = "Benötigter Raum Typ";
    roomtypeInputContainer.append(addRoomImg, roomtypeInput);
    const roomtypeDropdown = document.createElement("div");
    roomtypeDropdown.id = "roomtype-dropdown";
    const selectedRoomtypes = document.createElement("div");
    selectedRoomtypes.id = "selected-roomtypes";
    roomtypeBlock.append(roomtypeInputContainer, roomtypeDropdown, selectedRoomtypes);
    formGrid.append(nameInitials, roomtypeBlock);
    container.appendChild(formGrid);
    return container;
}
function openSubjectForm(existingSubject) {
    const noSubjectsElement = getElement("no-subjects");
    const disableOverlay = getElement("disable-overlay");
    const displaySubjects = getElement("display-subjects");
    const addSubjectScreen = getElement("add-subject-screen");
    if (!addSubjectScreen || !disableOverlay || !displaySubjects)
        return;
    if (noSubjectsElement)
        noSubjectsElement.style.display = "none";
    openPopup({ modal: addSubjectScreen, overlay: disableOverlay, scrollContainer: displaySubjects });
    const isEditMode = !!existingSubject;
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-subject-header-container";
    const title = document.createElement("h1");
    title.id = "add-subject-header";
    title.textContent = isEditMode
        ? "Dieses Fach bearbeiten"
        : "Ein neues Fach hinzufügen";
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
    const formContent = buildAddSubjectFormContent(existingSubject);
    const colorPickerContainer = document.createElement("div");
    colorPickerContainer.id = "color-selection-container";
    const confirmButton = document.createElement("div");
    confirmButton.id = "confirm-subject-btn";
    confirmButton.textContent = isEditMode ? "Speichern" : "Bestätigen";
    headerContainer.append(title, closeScreenButton);
    addSubjectScreen.replaceChildren(headerContainer, formContent, colorPickerContainer, confirmButton);
    const selectorInput = getElement("roomtype-input");
    const selectorDropdown = getElement("roomtype-dropdown");
    const selectedContainer = getElement("selected-roomtypes");
    const inputContainer = getElement("roomtype-input-container");
    if (!selectorInput || !selectorDropdown || !selectedContainer || !inputContainer)
        return;
    const roomTypeSelector = initRoomTypeSelector({
        input: selectorInput,
        dropdown: selectorDropdown,
        selectedContainer,
        inputContainer,
    });
    if (existingSubject) {
        existingSubject.requiredRoomTypes.forEach((type) => {
            roomTypeSelector.restore?.(type);
        });
    }
    const colorPicker = initColorPicker(colorPickerContainer);
    if (existingSubject) {
        colorPicker.setColor?.(existingSubject.subjectColor);
    }
    confirmButton.addEventListener("click", async () => {
        try {
            const subjectData = collectSubjectData(roomTypeSelector.getSelectedTypes(), colorPicker.getSelectedColor());
            if (!subjectData)
                return;
            if (isEditMode && existingSubject) {
                await updateSubject(existingSubject.id, subjectData);
                console.log("It works");
            }
            else {
                await createSubject(subjectData);
            }
            closePopup({
                modal: addSubjectScreen,
                overlay: disableOverlay,
                scrollContainer: displaySubjects,
            });
            await loadAndRenderSubjects();
        }
        catch (error) {
            console.error("Error occurred:", error);
        }
    });
}
function initializeApp() {
    initNavbar();
    void loadAndRenderSubjects();
    const addBtn = getElement("add-btn");
    addBtn?.addEventListener("click", () => openSubjectForm());
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
