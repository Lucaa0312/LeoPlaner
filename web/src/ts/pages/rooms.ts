import initNavbar from "./navbar.js";
import { fetchRooms, createRoom, updateRoom } from "../api/roomApi.js";
import { getElement, smartCase } from "../utils/elementHelpers.js";
import { buildModal, closeModal, openModal } from "../components/modal.js";
import {
    renderEmptyState,
    toggleEmptyState,
} from "../components/emptyState.js";
import { toast } from "../components/toast.js";
import { clearSkeleton, renderSkeleton } from "../components/skeleton.js";
import {
    initRoomTypeSelector,
    roomTypeLabel,
} from "../features/roomTypeSelector.js";
import type { CreateRoomRequest, Room, RoomType } from "../types/room.js";
import { applySearch, bindSearch } from "../features/searchElement.js";

const SEARCH = {
    inputId: "input-field",
    rowSelector: ".room-box",
    values: [".room-name", ".room-short", ".room-types"],
    noResultsEl: null as HTMLElement | null,
};

// Icon per dominant room type – gives the card grid some visual rhythm.
const TYPE_ICONS: Record<string, string> = {
    CLASSROOM: "ti ti-door",
    EDV: "ti ti-device-desktop",
    CHEM: "ti ti-flask",
    PHY: "ti ti-atom",
    SPORT: "ti ti-ball-basketball",
    WORKSHOP: "ti ti-tool",
};

function formatRoomTitle(room: Room): string {
    return smartCase(room.roomName);
}

function createRoomCard(room: Room): HTMLElement {
    const roomBox = document.createElement("article");
    roomBox.className = "card card--interactive entity-card room-box";

    const head = document.createElement("div");
    head.className = "entity-card__head";

    const icon = document.createElement("span");
    icon.className = "entity-card__icon";
    icon.setAttribute("aria-hidden", "true");
    const primaryType = room.roomTypes[0] ?? "CLASSROOM";
    icon.innerHTML = `<i class="${TYPE_ICONS[primaryType] ?? "ti ti-door"}"></i>`;

    const info = document.createElement("div");
    info.className = "room-info";

    const title = document.createElement("h2");
    title.className = "entity-card__title room-name";
    title.textContent = formatRoomTitle(room);

    const meta = document.createElement("div");
    meta.className = "room-meta";

    const short = document.createElement("span");
    short.className = "badge badge--mono room-short";
    short.textContent = room.nameShort;

    meta.appendChild(short);

    if (room.roomNumber) {
        const number = document.createElement("span");
        number.className = "entity-card__subtitle";
        number.textContent = `Nr. ${room.roomNumber}`;
        meta.appendChild(number);
    }

    info.append(title, meta);
    head.append(icon, info);

    const types = document.createElement("div");
    types.className = "entity-card__tags room-types";
    if (room.roomTypes.length === 0) {
        types.innerHTML = `<span class="badge badge--outline">Kein Typ</span>`;
    } else {
        room.roomTypes.forEach((type) => {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = roomTypeLabel(type);
            types.appendChild(badge);
        });
    }

    const actions = document.createElement("div");
    actions.className = "entity-card__actions";

    const editDiv = document.createElement("button");
    editDiv.type = "button";
    editDiv.className = "icon-btn icon-btn--primary room-edit";
    editDiv.title = `${formatRoomTitle(room)} bearbeiten`;
    editDiv.setAttribute("aria-label", editDiv.title);
    editDiv.innerHTML = `<i class="ti ti-pencil" aria-hidden="true"></i>`;
    editDiv.addEventListener("click", () => openEditRoomForm(room));

    actions.appendChild(editDiv);
    roomBox.append(head, types, actions);

    return roomBox;
}

let firstLoad = true;

async function loadAndRenderRooms(): Promise<void> {
    const noRoomsElement = getElement<HTMLElement>("no-rooms");
    const roomsContainer = getElement<HTMLElement>("display-rooms");

    if (!noRoomsElement || !roomsContainer) {
        return;
    }

    if (firstLoad) renderSkeleton(roomsContainer, 8, "card");

    try {
        const rooms = await fetchRooms();
        firstLoad = false;

        clearSkeleton(roomsContainer);
        roomsContainer.replaceChildren();
        toggleEmptyState(noRoomsElement, rooms.length > 0);
        if (SEARCH.noResultsEl) SEARCH.noResultsEl.hidden = true;

        if (rooms.length === 0) {
            return;
        }

        const gridContainer = document.createElement("div");
        gridContainer.className = "entity-grid grid-layout rise-in";

        for (const room of rooms) {
            gridContainer.appendChild(createRoomCard(room));
        }

        roomsContainer.appendChild(gridContainer);
        applySearch(SEARCH);
    } catch (error) {
        firstLoad = false;
        clearSkeleton(roomsContainer);
        console.error("Fehler beim Laden der Räume:", error);
    }
}

function collectRoomFormData(selectedTypes: RoomType[]): CreateRoomRequest | null {
    const nameInput = getElement<HTMLInputElement>("name-input");
    const numberInput = getElement<HTMLInputElement>("number-input");
    const roomShortInput = getElement<HTMLInputElement>("initials-input");

    if (!nameInput || !numberInput || !roomShortInput) {
        return null;
    }

    const name = nameInput.value.trim();
    const short = roomShortInput.value.trim();

    nameInput.setAttribute("aria-invalid", name ? "false" : "true");
    roomShortInput.setAttribute("aria-invalid", short ? "false" : "true");

    if (!name || !short) {
        toast.error("Bitte Name und Abkürzung angeben.");
        (name ? roomShortInput : nameInput).focus();
        return null;
    }

    return {
        roomName: name,
        roomNumber: Number(numberInput.value || 0),
        nameShort: short,
        roomTypes: selectedTypes,
    };
}

function buildField(
    id: string,
    label: string,
    placeholder: string,
    options: { required?: boolean; hint?: string; type?: string; inputMode?: string } = {},
): HTMLElement {
    const field = document.createElement("div");
    field.className = "field";

    const labelEl = document.createElement("label");
    labelEl.className = "field__label";
    labelEl.htmlFor = id;
    labelEl.innerHTML = options.required
        ? `${label}<span class="req" aria-hidden="true">*</span>`
        : label;

    const input = document.createElement("input");
    input.type = options.type ?? "text";
    input.id = id;
    input.className = "input room-input";
    input.placeholder = placeholder;
    input.autocomplete = "off";
    if (options.required) input.required = true;
    if (options.inputMode) input.inputMode = options.inputMode;

    field.append(labelEl, input);

    if (options.hint) {
        const hint = document.createElement("span");
        hint.className = "field__hint";
        hint.textContent = options.hint;
        field.appendChild(hint);
    }

    return field;
}

function buildAddRoomModalContent(): HTMLElement {
    const content = document.createElement("div");
    content.id = "room-modal-content";

    const basics = document.createElement("section");
    basics.className = "form-section";
    basics.innerHTML = `<p class="form-section__title">Bezeichnung</p>`;

    const nameInitialsDiv = document.createElement("div");
    nameInitialsDiv.className = "form-grid form-name-initials-inputs";
    nameInitialsDiv.append(
        buildField("name-input", "Name", "z. B. Physiksaal", { required: true }),
        buildField("initials-input", "Abkürzung", "z. B. PH1", {
            required: true,
            hint: "Erscheint im Stundenplan.",
        }),
    );
    basics.appendChild(nameInitialsDiv);

    const numbering = document.createElement("section");
    numbering.className = "form-section";
    numbering.innerHTML = `<p class="form-section__title">Nummerierung</p>`;

    const numberPrefixSuffixDiv = document.createElement("div");
    numberPrefixSuffixDiv.className = "form-grid form-grid--3 form-number-prefix-suffix-inputs";
    numberPrefixSuffixDiv.append(
        buildField("number-input", "Nummer", "z. B. 204", { inputMode: "numeric" }),
        buildField("prefix-input", "Präfix", "z. B. E", { hint: "Optional" }),
        buildField("suffix-input", "Suffix", "z. B. a", { hint: "Optional" }),
    );
    numbering.appendChild(numberPrefixSuffixDiv);

    const roomtypeBlock = document.createElement("section");
    roomtypeBlock.id = "roomtype-block";
    roomtypeBlock.className = "form-section";
    roomtypeBlock.innerHTML = `
      <p class="form-section__title">Ausstattung</p>
      <p class="form-intro">Welche Art von Unterricht kann hier stattfinden? Fächer mit passenden Anforderungen werden diesem Raum zugeteilt.</p>`;

    const combo = document.createElement("div");
    combo.className = "combo";

    const roomtypeInputContainer = document.createElement("div");
    roomtypeInputContainer.id = "roomtype-input-container";
    roomtypeInputContainer.className = "combo__input";

    const img = document.createElement("i");
    img.id = "add-room-img";
    img.className = "ti ti-search";
    img.setAttribute("aria-hidden", "true");

    const roomtypeInput = document.createElement("input");
    roomtypeInput.type = "text";
    roomtypeInput.id = "roomtype-input";
    roomtypeInput.className = "input";
    roomtypeInput.placeholder = "Raumtyp auswählen …";
    roomtypeInput.autocomplete = "off";
    roomtypeInput.setAttribute("aria-label", "Raumtyp auswählen");
    roomtypeInputContainer.append(img, roomtypeInput);

    const roomtypeDropdown = document.createElement("div");
    roomtypeDropdown.id = "roomtype-dropdown";
    roomtypeDropdown.className = "combo__menu";
    roomtypeDropdown.setAttribute("role", "listbox");

    combo.append(roomtypeInputContainer, roomtypeDropdown);

    const selectedRoomtypes = document.createElement("div");
    selectedRoomtypes.id = "selected-roomtypes";
    selectedRoomtypes.className = "chip-list chip-list--boxed";
    selectedRoomtypes.dataset.empty = "Noch kein Raumtyp ausgewählt";

    roomtypeBlock.append(combo, selectedRoomtypes);

    content.append(basics, numbering, roomtypeBlock);
    return content;
}

function openEditRoomForm(room: Room): void {
    openRoomForm(room);
}

function openAddRoomForm(): void {
    openRoomForm(null);
}

function openRoomForm(room: Room | null): void {
    const addRoomScreen = getElement<HTMLElement>("add-room-screen");
    if (!addRoomScreen) {
        return;
    }

    const frame = buildModal(addRoomScreen, {
        title: room ? `${formatRoomTitle(room)} bearbeiten` : "Neuen Raum anlegen",
        subtitle: room
            ? "Änderungen wirken sich auf künftige Stundenpläne aus."
            : "Die Abkürzung erscheint später im Stundenplan.",
        size: "md",
    });

    const content = buildAddRoomModalContent();
    frame.body.replaceChildren(content);

    const nameInput = content.querySelector<HTMLInputElement>("#name-input");
    const numberInput = content.querySelector<HTMLInputElement>("#number-input");
    const initialsInput = content.querySelector<HTMLInputElement>("#initials-input");
    const prefixInput = content.querySelector<HTMLInputElement>("#prefix-input");
    const suffixInput = content.querySelector<HTMLInputElement>("#suffix-input");

    if (room) {
        if (!nameInput || !numberInput || !initialsInput) {
            throw new Error("Form inputs missing");
        }
        nameInput.value = room.roomName;
        numberInput.value = String(room.roomNumber);
        initialsInput.value = room.nameShort;
        if (prefixInput) prefixInput.value = room.roomPrefix ?? "";
        if (suffixInput) suffixInput.value = room.roomSuffix ?? "";
    }

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "btn btn--ghost";
    cancelButton.textContent = "Abbrechen";
    cancelButton.dataset.modalClose = "";

    const spacer = document.createElement("span");
    spacer.className = "spacer";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.id = "confirm-room-btn";
    confirmButton.className = "btn btn--primary";
    confirmButton.innerHTML = `<i class="ti ti-check" aria-hidden="true"></i><span>${room ? "Speichern" : "Raum anlegen"}</span>`;

    frame.footer.replaceChildren(cancelButton, spacer, confirmButton);

    openModal(addRoomScreen);

    const selectorInput = getElement<HTMLInputElement>("roomtype-input");
    const selectorDropdown = getElement<HTMLElement>("roomtype-dropdown");
    const selectedContainer = getElement<HTMLElement>("selected-roomtypes");
    const inputContainer = getElement<HTMLElement>("roomtype-input-container");

    if (!selectorInput || !selectorDropdown || !selectedContainer || !inputContainer) {
        return;
    }

    const roomTypeSelector = initRoomTypeSelector({
        input: selectorInput,
        dropdown: selectorDropdown,
        selectedContainer,
        inputContainer,
    });

    if (room) {
        room.roomTypes.forEach((type) => {
            roomTypeSelector.restore?.(type);
        });
    }

    let saving = false;
    confirmButton.addEventListener("click", async () => {
        if (saving) return;

        try {
            const roomData = collectRoomFormData(roomTypeSelector.getSelectedTypes());

            if (!roomData) {
                return;
            }

            saving = true;
            confirmButton.classList.add("btn--loading");

            if (room) {
                await updateRoom(room.id, roomData);
                toast.success(`${formatRoomTitle({ ...room, ...roomData })} wurde aktualisiert.`);
            } else {
                await createRoom(roomData);
                toast.success(`Raum „${roomData.roomName}“ wurde angelegt.`);
            }

            closeModal(addRoomScreen);
            await loadAndRenderRooms();
        } catch (error) {
            console.error("Fehler beim Erstellen des Raums:", error);
        } finally {
            saving = false;
            confirmButton.classList.remove("btn--loading");
        }
    });
}

function initializeApp(): void {
    initNavbar();

    const noRooms = getElement<HTMLElement>("no-rooms");
    if (noRooms) {
        renderEmptyState(noRooms, {
            illustration: "rooms",
            title: "Noch keine Räume",
            hint: "Legen Sie Ihren ersten Raum an und geben Sie an, welche Art von Unterricht dort möglich ist.",
            ctaLabel: "Raum hinzufügen",
            onCta: () => openAddRoomForm(),
        });
    }

    const noResults = getElement<HTMLElement>("no-results");
    if (noResults) {
        renderEmptyState(noResults, {
            illustration: "search",
            title: "Keine Treffer",
            hint: "Kein Raum passt zu Ihrer Suche.",
            compact: true,
        });
        noResults.hidden = true;
        SEARCH.noResultsEl = noResults;
    }

    bindSearch(SEARCH);
    void loadAndRenderRooms();

    const addBtn = getElement<HTMLElement>("add-btn");
    addBtn?.addEventListener("click", openAddRoomForm);
}

document.addEventListener("DOMContentLoaded", initializeApp);
