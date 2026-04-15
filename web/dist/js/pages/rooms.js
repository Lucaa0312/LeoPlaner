import initNavbar from "./navbar.js";
import { fetchRooms, createRoom, updateRoom } from "../api/roomApi.js";
import { aquireElement, getElement } from "../utils/elementHelpers.js";
import { openPopup, closePopup } from "../components/popup.js";
import { toggleEmptyState } from "../components/emptyState.js";
import { initRoomTypeSelector } from "../features/roomTypeSelector.js";
import { initSearchElement } from "../features/searchElement.js";
let editingRoom = null;
function formatRoomName(room) {
    console.log(room);
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
    editDiv.addEventListener("click", () => {
        openEditRoomForm(room);
    });
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
    const roomShortInput = getElement("initials-input");
    if (!nameInput || !numberInput || !roomShortInput) {
        return null;
    }
    return {
        roomName: nameInput.value.trim(),
        roomNumber: Number(numberInput.value || 0),
        nameShort: roomShortInput.value.trim(),
        roomTypes: selectedTypes,
    };
}
function buildAddRoomModalContent() {
    const content = document.createElement("div");
    content.id = "room-modal-content";
    const roomFormGrid = document.createElement("div");
    roomFormGrid.className = "room-form-grid";
    const nameInitialsDiv = document.createElement("div");
    nameInitialsDiv.className = "form-name-initials-inputs";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.id = "name-input";
    nameInput.className = "room-input";
    nameInput.placeholder = "Name";
    const initialsInput = document.createElement("input");
    initialsInput.type = "text";
    initialsInput.id = "initials-input";
    initialsInput.className = "room-input";
    initialsInput.placeholder = "Abkürzung";
    nameInitialsDiv.append(nameInput, initialsInput);
    const numberPrefixSuffixDiv = document.createElement("div");
    numberPrefixSuffixDiv.className = "form-number-prefix-suffix-inputs";
    const numberInput = document.createElement("input");
    numberInput.type = "text";
    numberInput.id = "number-input";
    numberInput.className = "room-input";
    numberInput.placeholder = "Nummer";
    const prefixInput = document.createElement("input");
    prefixInput.type = "text";
    prefixInput.id = "prefix-input";
    prefixInput.className = "room-input";
    prefixInput.placeholder = "Prefix";
    const suffixInput = document.createElement("input");
    suffixInput.type = "text";
    suffixInput.id = "suffix-input";
    suffixInput.className = "room-input";
    suffixInput.placeholder = "Suffix";
    numberPrefixSuffixDiv.append(numberInput, prefixInput, suffixInput);
    const roomtypeBlock = document.createElement("div");
    roomtypeBlock.id = "roomtype-block";
    const roomtypeInputContainer = document.createElement("div");
    roomtypeInputContainer.id = "roomtype-input-container";
    const img = document.createElement("img");
    img.id = "add-room-img";
    img.src = "../assets/img/magnifyingGlass.png";
    img.alt = "Add Room";
    const roomtypeInput = document.createElement("input");
    roomtypeInput.type = "text";
    roomtypeInput.id = "roomtype-input";
    roomtypeInput.placeholder = "Raum Typen auswählen";
    roomtypeInputContainer.append(img, roomtypeInput);
    const roomtypeDropdown = document.createElement("div");
    roomtypeDropdown.id = "roomtype-dropdown";
    const selectedRoomtypes = document.createElement("div");
    selectedRoomtypes.id = "selected-roomtypes";
    roomtypeBlock.append(roomtypeInputContainer, roomtypeDropdown, selectedRoomtypes);
    roomFormGrid.append(nameInitialsDiv, numberPrefixSuffixDiv, roomtypeBlock);
    content.appendChild(roomFormGrid);
    return content;
}
function openEditRoomForm(room) {
    editingRoom = room;
    openRoomForm(room);
}
function openAddRoomForm() {
    editingRoom = null;
    openRoomForm(null);
}
function openRoomForm(room) {
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
    title.textContent = room
        ? "Diesen Raum bearbeiten"
        : "Einen neuen Raum hinzufügen";
    const closeButton = document.createElement("div");
    closeButton.id = "close-add-room-screen-btn";
    closeButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;
    const content = buildAddRoomModalContent();
    const nameInput = content.querySelector("#name-input");
    const numberInput = content.querySelector("#number-input");
    const initialsInput = content.querySelector("#initials-input");
    if (room) {
        if (!nameInput || !numberInput || !initialsInput) {
            throw new Error("Form inputs missing");
        }
        nameInput.value = room.roomName;
        numberInput.value = String(room.roomNumber);
        initialsInput.value = room.nameShort;
    }
    const confirmButton = document.createElement("div");
    confirmButton.id = "confirm-room-btn";
    confirmButton.textContent = room ? "Speichern" : "Bestätigen";
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
    if (room) {
        room.roomTypes.forEach(type => {
            roomTypeSelector.restore?.(type);
        });
    }
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
            if (room) {
                await updateRoom(room.id, roomData);
                console.log("It works");
            }
            else {
                await createRoom(roomData);
            }
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
function initializeApp() {
    initNavbar();
    void loadAndRenderRooms();
    const addBtn = getElement("add-btn");
    addBtn?.addEventListener("click", openAddRoomForm);
    const inputField = getElement("input-field");
    inputField?.addEventListener("input", () => {
        initSearchElement({
            inputId: "input-field",
            selectedRow: ".room-box",
            values: [".room-name", ".room-types"],
        });
    });
}
document.addEventListener("DOMContentLoaded", initializeApp);
