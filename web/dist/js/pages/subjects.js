import initNavbar from "./navbar.js";
import { fetchSubjects, createSubject, updateSubject, } from "../api/subjectApi.js";
import { getElement, formatName, aquireElement, } from "../utils/elementHelpers.js";
import { buildModal, closeModal, openModal } from "../components/modal.js";
import { renderEmptyState, toggleEmptyState, } from "../components/emptyState.js";
import { toast } from "../components/toast.js";
import { clearSkeleton, renderSkeleton } from "../components/skeleton.js";
import { initRoomTypeSelector, roomTypeLabel, } from "../features/roomTypeSelector.js";
import { initColorPicker } from "../features/colorSelector.js";
import { applySearch, bindSearch } from "../features/searchElement.js";
const DEFAULT_SUBJECT_COLOR = {
    red: 128,
    green: 128,
    blue: 128,
};
const SEARCH = {
    inputId: "input-field",
    rowSelector: ".subject-box",
    values: [".subject-name", ".subject-symbol", ".room-types"],
    noResultsEl: null,
};
function cssColor(color) {
    const c = color ?? DEFAULT_SUBJECT_COLOR;
    return `rgb(${c.red}, ${c.green}, ${c.blue})`;
}
function createRoomTypesElement(roomTypes) {
    const tags = document.createElement("div");
    tags.className = "entity-card__tags room-types";
    if (roomTypes.length === 0) {
        tags.innerHTML = `<span class="badge badge--outline"><i class="ti ti-door" aria-hidden="true"></i>Beliebiger Raum</span>`;
        return tags;
    }
    roomTypes.forEach((type) => {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = roomTypeLabel(type);
        badge.title = `Benötigt Raumtyp ${roomTypeLabel(type)}`;
        tags.appendChild(badge);
    });
    return tags;
}
function createSubjectCard(subject) {
    const subjectBox = document.createElement("article");
    subjectBox.className =
        "card card--interactive entity-card entity-card--colored subject-box";
    subjectBox.style.setProperty("--card-color", cssColor(subject.subjectColor));
    const head = document.createElement("div");
    head.className = "entity-card__head";
    const titleWrap = document.createElement("div");
    titleWrap.className = "subject-info";
    const subjectName = document.createElement("h2");
    subjectName.className = "entity-card__title subject-name";
    subjectName.title = subject.subjectName;
    subjectName.textContent = formatName(subject.subjectName);
    const symbol = document.createElement("span");
    symbol.className = "badge badge--mono subject-symbol";
    symbol.textContent = subject.subjectSymbol;
    titleWrap.append(subjectName, symbol);
    const swatch = document.createElement("span");
    swatch.className = "subject-swatch";
    swatch.setAttribute("aria-hidden", "true");
    head.append(titleWrap, swatch);
    const actions = document.createElement("div");
    actions.className = "entity-card__actions";
    const editDiv = document.createElement("button");
    editDiv.type = "button";
    editDiv.className = "icon-btn icon-btn--primary subject-edit";
    editDiv.title = `${formatName(subject.subjectName)} bearbeiten`;
    editDiv.setAttribute("aria-label", editDiv.title);
    editDiv.innerHTML = `<i class="ti ti-pencil" aria-hidden="true"></i>`;
    editDiv.addEventListener("click", () => openEditSubjectForm(subject));
    actions.appendChild(editDiv);
    subjectBox.append(head, createRoomTypesElement(subject.requiredRoomTypes), actions);
    return subjectBox;
}
function openEditSubjectForm(subject) {
    openSubjectForm(subject);
}
let firstLoad = true;
async function loadAndRenderSubjects() {
    const noSubjectsElement = getElement("no-subjects");
    const subjectsContainer = getElement("display-subjects");
    if (!noSubjectsElement || !subjectsContainer) {
        return;
    }
    if (firstLoad)
        renderSkeleton(subjectsContainer, 8, "card");
    try {
        const subjects = await fetchSubjects();
        firstLoad = false;
        clearSkeleton(subjectsContainer);
        subjectsContainer.replaceChildren();
        toggleEmptyState(noSubjectsElement, subjects.length > 0);
        if (SEARCH.noResultsEl)
            SEARCH.noResultsEl.hidden = true;
        if (subjects.length === 0) {
            return;
        }
        const gridContainer = document.createElement("div");
        gridContainer.className = "entity-grid grid-layout rise-in";
        for (const subject of subjects) {
            gridContainer.appendChild(createSubjectCard(subject));
        }
        subjectsContainer.appendChild(gridContainer);
        applySearch(SEARCH);
    }
    catch (error) {
        firstLoad = false;
        clearSkeleton(subjectsContainer);
        console.error("Fehler beim Laden der Fächer:", error);
    }
}
function collectSubjectData(selectetRoomTypes, selectedSubjectColor) {
    const nameInput = getElement("name-input");
    const symbolInput = aquireElement("initials-input");
    if (!nameInput) {
        throw new Error("Fehlendes Formularelement");
    }
    const name = nameInput.value.trim();
    const symbol = symbolInput.value.trim();
    nameInput.setAttribute("aria-invalid", name ? "false" : "true");
    symbolInput.setAttribute("aria-invalid", symbol ? "false" : "true");
    if (!name || !symbol) {
        toast.error("Bitte Name und Abkürzung angeben.");
        (name ? symbolInput : nameInput).focus();
        return null;
    }
    return {
        subjectName: name,
        subjectSymbol: symbol,
        requiredRoomTypes: selectetRoomTypes,
        subjectColor: selectedSubjectColor,
    };
}
function buildField(id, label, placeholder, value, hint) {
    const field = document.createElement("div");
    field.className = "field";
    const labelEl = document.createElement("label");
    labelEl.className = "field__label";
    labelEl.htmlFor = id;
    labelEl.innerHTML = `${label}<span class="req" aria-hidden="true">*</span>`;
    const input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.className = "input subject-input";
    input.placeholder = placeholder;
    input.value = value;
    input.required = true;
    input.autocomplete = "off";
    field.append(labelEl, input);
    if (hint) {
        const hintEl = document.createElement("span");
        hintEl.className = "field__hint";
        hintEl.textContent = hint;
        field.appendChild(hintEl);
    }
    return field;
}
function buildAddSubjectFormContent(subject) {
    const container = document.createElement("div");
    container.id = "subject-modal-content";
    // name / initials block
    const basics = document.createElement("section");
    basics.className = "form-section";
    basics.innerHTML = `<p class="form-section__title">Bezeichnung</p>`;
    const formGrid = document.createElement("div");
    formGrid.className = "form-grid form-name-initials-inputs";
    formGrid.append(buildField("name-input", "Name", "z. B. Mathematik", subject?.subjectName ?? ""), buildField("initials-input", "Abkürzung", "z. B. M", subject?.subjectSymbol ?? "", "Erscheint im Stundenplan."));
    basics.appendChild(formGrid);
    // roomtype block
    const roomtypeBlock = document.createElement("section");
    roomtypeBlock.id = "roomtype-block";
    roomtypeBlock.className = "form-section";
    roomtypeBlock.innerHTML = `
    <p class="form-section__title">Benötigte Raumtypen</p>
    <p class="form-intro">Nur relevant, wenn das Fach spezielle Räume braucht – etwa einen EDV-Saal oder eine Werkstatt.</p>`;
    const combo = document.createElement("div");
    combo.className = "combo";
    const roomtypeInputContainer = document.createElement("div");
    roomtypeInputContainer.id = "roomtype-input-container";
    roomtypeInputContainer.className = "combo__input";
    const addRoomImg = document.createElement("i");
    addRoomImg.id = "add-room-img";
    addRoomImg.className = "ti ti-search";
    addRoomImg.setAttribute("aria-hidden", "true");
    const roomtypeInput = document.createElement("input");
    roomtypeInput.type = "text";
    roomtypeInput.id = "roomtype-input";
    roomtypeInput.className = "input";
    roomtypeInput.placeholder = "Raumtyp suchen …";
    roomtypeInput.autocomplete = "off";
    roomtypeInput.setAttribute("aria-label", "Raumtyp suchen");
    roomtypeInputContainer.append(addRoomImg, roomtypeInput);
    const roomtypeDropdown = document.createElement("div");
    roomtypeDropdown.id = "roomtype-dropdown";
    roomtypeDropdown.className = "combo__menu";
    roomtypeDropdown.setAttribute("role", "listbox");
    combo.append(roomtypeInputContainer, roomtypeDropdown);
    const selectedRoomtypes = document.createElement("div");
    selectedRoomtypes.id = "selected-roomtypes";
    selectedRoomtypes.className = "chip-list chip-list--boxed";
    selectedRoomtypes.dataset.empty = "Kein spezieller Raum nötig";
    roomtypeBlock.append(combo, selectedRoomtypes);
    // colour block
    const colorBlock = document.createElement("section");
    colorBlock.className = "form-section";
    colorBlock.innerHTML = `<p class="form-section__title">Farbe im Stundenplan</p>`;
    const colorPickerContainer = document.createElement("div");
    colorPickerContainer.id = "color-selection-container";
    colorBlock.appendChild(colorPickerContainer);
    container.append(basics, roomtypeBlock, colorBlock);
    return container;
}
function openSubjectForm(existingSubject) {
    const addSubjectScreen = getElement("add-subject-screen");
    if (!addSubjectScreen)
        return;
    const isEditMode = !!existingSubject;
    const frame = buildModal(addSubjectScreen, {
        title: isEditMode
            ? `${formatName(existingSubject.subjectName)} bearbeiten`
            : "Neues Fach anlegen",
        subtitle: isEditMode
            ? "Änderungen wirken sich auf alle Klassen aus, die dieses Fach haben."
            : "Kürzel und Farbe erscheinen später im Stundenplan.",
        size: "lg",
    });
    const formContent = buildAddSubjectFormContent(existingSubject);
    frame.body.replaceChildren(formContent);
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "btn btn--ghost";
    cancelButton.textContent = "Abbrechen";
    cancelButton.dataset.modalClose = "";
    const spacer = document.createElement("span");
    spacer.className = "spacer";
    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.id = "confirm-subject-btn";
    confirmButton.className = "btn btn--primary";
    confirmButton.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i><span>${isEditMode ? "Speichern" : "Fach anlegen"}</span>`;
    frame.footer.replaceChildren(cancelButton, spacer, confirmButton);
    openModal(addSubjectScreen);
    const selectorInput = getElement("roomtype-input");
    const selectorDropdown = getElement("roomtype-dropdown");
    const selectedContainer = getElement("selected-roomtypes");
    const inputContainer = getElement("roomtype-input-container");
    const colorPickerContainer = getElement("color-selection-container");
    if (!selectorInput ||
        !selectorDropdown ||
        !selectedContainer ||
        !inputContainer ||
        !colorPickerContainer)
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
    if (existingSubject?.subjectColor) {
        colorPicker.setColor?.(existingSubject.subjectColor);
    }
    let saving = false;
    confirmButton.addEventListener("click", async () => {
        if (saving)
            return;
        try {
            const subjectData = collectSubjectData(roomTypeSelector.getSelectedTypes(), colorPicker.getSelectedColor());
            if (!subjectData)
                return;
            saving = true;
            confirmButton.classList.add("btn--loading");
            if (isEditMode && existingSubject) {
                await updateSubject(existingSubject.id, subjectData);
                toast.success(`${formatName(subjectData.subjectName)} wurde aktualisiert.`);
            }
            else {
                await createSubject(subjectData);
                toast.success(`${formatName(subjectData.subjectName)} wurde angelegt.`);
            }
            closeModal(addSubjectScreen);
            await loadAndRenderSubjects();
        }
        catch (error) {
            console.error("Error occurred:", error);
        }
        finally {
            saving = false;
            confirmButton.classList.remove("btn--loading");
        }
    });
}
function initializeApp() {
    initNavbar();
    const noSubjects = getElement("no-subjects");
    if (noSubjects) {
        renderEmptyState(noSubjects, {
            illustration: "subjects",
            title: "Noch keine Fächer",
            hint: "Legen Sie Ihr erstes Fach an. Kürzel und Farbe machen den Stundenplan später auf einen Blick lesbar.",
            ctaLabel: "Fach hinzufügen",
            onCta: () => openSubjectForm(),
        });
    }
    const noResults = getElement("no-results");
    if (noResults) {
        renderEmptyState(noResults, {
            illustration: "search",
            title: "Keine Treffer",
            hint: "Kein Fach passt zu Ihrer Suche.",
            compact: true,
        });
        noResults.hidden = true;
        SEARCH.noResultsEl = noResults;
    }
    bindSearch(SEARCH);
    void loadAndRenderSubjects();
    const addBtn = getElement("add-btn");
    addBtn?.addEventListener("click", () => openSubjectForm());
}
document.addEventListener("DOMContentLoaded", initializeApp);
