import initNavbar from "./navbar.js";
import { fetchRooms, createRoom } from "../api/roomApi.js";
import { getElement } from "../utils/elementHelpers.js";
import { openPopup, closePopup } from "../components/popup.js";
import { toggleEmptyState } from "../components/emptyState.js";
import { initRoomTypeSelector } from "../features/roomTypeSelector.js";
function formatRoomName(room) {
    return `${room.nameShort.toUpperCase()} - ${room.roomName.charAt(0).toUpperCase()}${room.roomName.slice(1).toLowerCase()}`;
}
function createRoomCard(room) {
    const roomBox = document.createElement("div");
    roomBox.className = "room-box";
    const roomInfo = document.createElement("div");
    roomInfo.className = "room-info";
    const title = document.createElement("h2");
    title.className = "room-name";
    title.textContent = formatRoomName(room);
    const types = document.createElement("p");
    types.className = "room-types";
    types.innerHTML = room.roomTypes.join("<br>");
    const editDiv = document.createElement("div");
    editDiv.className = "room-edit";
    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
    roomInfo.append(title, types);
    roomBox.append(roomInfo, editDiv);
    return roomBox;
}
async function loadAndRenderRooms() {
    const noRoomsElement = getElement("no-rooms");
    const roomsContainer = getElement("display-rooms");
    if (!noRoomsElement || !roomsContainer) {
        return;
    }
    try {
        const rooms = await fetchRooms();
        toggleEmptyState(noRoomsElement, rooms.length > 0);
        roomsContainer.replaceChildren();
        if (rooms.length === 0) {
            return;
        }
        const gridContainer = document.createElement("div");
        gridContainer.className = "grid-layout";
        for (const room of rooms) {
            gridContainer.appendChild(createRoomCard(room));
        }
        roomsContainer.appendChild(gridContainer);
    }
    catch (error) {
        console.error("Fehler beim Laden der Räume:", error);
    }
}
function collectRoomFormData(selectedTypes) {
    const nameInput = getElement("name-input");
    const numberInput = getElement("number-input");
    const prefixInput = getElement("prefix-input");
    const suffixInput = getElement("suffix-input");
    if (!nameInput || !numberInput || !prefixInput || !suffixInput) {
        return null;
    }
    return {
        roomName: nameInput.value.trim(),
        roomNumber: Number(numberInput.value || 0),
        roomPrefix: prefixInput.value.trim(),
        roomSuffix: suffixInput.value.trim(),
        roomTypes: selectedTypes,
    };
}
function buildAddRoomModalContent() {
    const content = document.createElement("div");
    content.id = "room-modal-content";
    content.innerHTML = `
        <div class="room-form-grid">
            <div class="form-name-initials-inputs">
                <input type="text" id="name-input" class="room-input" placeholder="Name">
                <input type="text" id="initials-input" class="room-input" placeholder="Abkürzung">
            </div>

            <div class="form-number-prefix-suffix-inputs">
                <input type="text" id="number-input" class="room-input" placeholder="Nummer">
                <input type="text" id="prefix-input" class="room-input" placeholder="Prefix">
                <input type="text" id="suffix-input" class="room-input" placeholder="Suffix">
            </div>

            <div id="roomtype-block">
                <div id="roomtype-input-container">
                    <img id="add-room-img" src="../assets/img/magnifyingGlass.png" alt="Add Room"/>
                    <input type="text" id="roomtype-input" placeholder="Raum Typen auswählen">
                </div>

                <div id="roomtype-dropdown"></div>
                <div id="selected-roomtypes"></div>
            </div>
        </div>
    `;
    return content;
}
function openAddRoomForm() {
    const noRooms = getElement("no-rooms");
    const overlay = getElement("disable-overlay");
    const displayRooms = getElement("display-rooms");
    const addRoomScreen = getElement("add-room-screen");
    if (!overlay || !displayRooms || !addRoomScreen) {
        return;
    }
    if (noRooms) {
        noRooms.style.display = "none";
    }
    openPopup({
        modal: addRoomScreen,
        overlay,
        scrollContainer: displayRooms,
    });
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-room-header-container";
    const title = document.createElement("h1");
    title.id = "add-room-header";
    title.textContent = "Einen neuen Raum hinzufügen";
    const closeButton = document.createElement("div");
    closeButton.id = "close-add-room-screen-btn";
    closeButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;
    const content = buildAddRoomModalContent();
    const confirmButton = document.createElement("div");
    confirmButton.id = "confirm-room-btn";
    confirmButton.textContent = "Bestätigen";
    headerContainer.append(title, closeButton);
    addRoomScreen.replaceChildren(headerContainer, content, confirmButton);
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
    closeButton.addEventListener("click", () => {
        closePopup({
            modal: addRoomScreen,
            overlay,
            scrollContainer: displayRooms,
        });
    });
    confirmButton.addEventListener("click", async () => {
        try {
            const roomData = collectRoomFormData(roomTypeSelector.getSelectedTypes());
            if (!roomData) {
                return;
            }
            await createRoom(roomData);
            closePopup({
                modal: addRoomScreen,
                overlay,
                scrollContainer: displayRooms,
            });
            await loadAndRenderRooms();
        }
        catch (error) {
            console.error("Fehler beim Erstellen des Raums:", error);
        }
    });
}
function searchRooms() {
    const inputEl = getElement("input-field");
    if (!inputEl) {
        return;
    }
    const query = inputEl.value.toLowerCase();
    const rows = document.querySelectorAll(".room-box");
    rows.forEach((row) => {
        const nameEl = row.querySelector(".room-name");
        const typesEl = row.querySelector(".room-types");
        if (!nameEl || !typesEl) {
            return;
        }
        const name = nameEl.textContent?.toLowerCase() ?? "";
        const types = typesEl.textContent?.toLowerCase() ?? "";
        row.style.display =
            query === "" || name.includes(query) || types.includes(query) ? "" : "none";
    });
}
function initializeApp() {
    initNavbar();
    void loadAndRenderRooms();
    const addBtn = getElement("add-btn");
    addBtn?.addEventListener("click", openAddRoomForm);
    const inputField = getElement("input-field");
    inputField?.addEventListener("input", searchRooms);
}
document.addEventListener("DOMContentLoaded", initializeApp);
