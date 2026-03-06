/*import  initNavbar  from "./navbar.js";

// room types available
const allRoomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
let selectedRoomTypes: string[] = [];

// Function to initialize room type search
function initRoomTypeSearch() {
    const input: HTMLInputElement = document.getElementById("roomtype-input") as HTMLInputElement;
    const dropdown: HTMLElement = document.getElementById("roomtype-dropdown") as HTMLElement;

    input.addEventListener("input", () => {
        const query = input.value.toUpperCase().trim();
        dropdown.innerHTML = "";

        if (!query) return;

        const matches = allRoomTypes
            .filter(rt => rt.includes(query) && !selectedRoomTypes.includes(rt));

        if (matches.length === 0) {
            dropdown.innerHTML = `<div class="dropdown-item">Keine Raumtypen gefunden</div>`;
            return;
        }

        matches.forEach(rt => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = rt;

            item.onclick = () => {
                addRoomTypeChip(rt);
                dropdown.innerHTML = "";
                input.value = "";
            };

            dropdown.appendChild(item);
        });
    });

   
    document.addEventListener("click", (e) => {
        const target = e.target as Element | null;
        if (!target?.closest("#roomtype-input-container")) {
            dropdown.innerHTML = "";
        }
    });
}

// Function to add a room type chip
function addRoomTypeChip(type: string) {
    selectedRoomTypes.push(type);

    const container = document.getElementById("selected-roomtypes") as HTMLElement;

    const chip = document.createElement("div");
    chip.className = "roomtype-chip";
    chip.innerHTML = `${type}<span class="remove-chip">×</span>`;

    chip.onclick = () => {
        selectedRoomTypes = selectedRoomTypes.filter(t => t !== type);
        chip.remove();
    };

    container.appendChild(chip);
}

// Function to add a new room
function addRoom() {
    const roomData = {
        roomName: (document.getElementById("name-input") as HTMLInputElement)?.value.trim() || "",
        roomNumber: Number((document.getElementById("number-input") as HTMLInputElement)?.value || 0),
        roomPrefix: (document.getElementById("prefix-input") as HTMLInputElement)?.value.trim() || "",
        roomSuffix: (document.getElementById("suffix-input") as HTMLInputElement)?.value.trim() || "",
        roomTypes: selectedRoomTypes
    };

    
  console.log("SENDING", roomData);

    return fetch("http://localhost:8080/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomData)
    });
}


// Function to load the Add Room form
function loadAddRoomForm() {
    selectedRoomTypes = [];

  
    const noRooms: HTMLElement | null = document.getElementById("no-rooms") as HTMLElement | null;
    if (noRooms) noRooms.style.display = "none";
    
        
    const disableOverlay: HTMLElement | null = document.getElementById("disable-overlay") as HTMLElement | null;
    if (disableOverlay) disableOverlay.style.display = "block";

    const displayRooms: HTMLElement | null = document.getElementById("display-rooms") as HTMLElement | null;
    if (displayRooms) displayRooms.style.overflowY = "hidden";

    const addRoomScreen: HTMLElement | null = document.getElementById("add-room-screen") as HTMLElement | null;
    if (addRoomScreen) {
        addRoomScreen.style.display = "flex";
        addRoomScreen.style.flexDirection = "column";
    }
    if (!addRoomScreen) return;

    const headerContainer = document.createElement("div");
    headerContainer.id = "add-room-header-container";
    headerContainer.innerHTML = `
    <h1 id="add-room-header">Einen neuen Raum hinzufügen</h1>`;

    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-room-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;

    closeScreenButton.onclick = () => {
        if (displayRooms) displayRooms.style.overflowY = "scroll";
        if (addRoomScreen) addRoomScreen.style.display = "none";
        if (disableOverlay) disableOverlay.style.display = "none";
    };

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

    const confirmBtn = document.createElement("div");
    confirmBtn.id = "confirm-room-btn";
    confirmBtn.textContent = "Bestätigen";
    confirmBtn.onclick = () => {
        addRoom();

        if (addRoomScreen) addRoomScreen.style.display = "none";
        if (disableOverlay) disableOverlay.style.display = "none";
        if (displayRooms) displayRooms.style.overflowY = "scroll";

        setTimeout(() => {
            loadRooms();
        }, 500);
    };


    headerContainer.appendChild(closeScreenButton);
    addRoomScreen.replaceChildren(headerContainer, content, confirmBtn);

    initRoomTypeSearch();
}


// Fetch and display all rooms
function loadRooms() {
    fetch("http://localhost:8080/api/rooms")
        .then(res => res.json())
        .then((data: any[]) => {
            console.log(data);
            if (!data || data.length === 0) {
                console.log("No rooms found");
                const noRoomsEl = document.getElementById("no-rooms") as HTMLElement | null;
                if (noRoomsEl) noRoomsEl.style.display = "block";
                return;
            }
            else {
                const noRoomsEl = document.getElementById("no-rooms") as HTMLElement | null;
                if (noRoomsEl) noRoomsEl.style.display = "none";
                const roomsContainer = document.getElementById("display-rooms") as HTMLElement | null;
                if (!roomsContainer) return;
                roomsContainer.innerHTML = "";

                const gridContainer = document.createElement("div");
                gridContainer.className = "grid-layout";

                data.forEach((room: any) => {
                    const roomBox = document.createElement("div");
                    roomBox.className = "room-box";
                    
                    const roomInfo = document.createElement("div");
                    roomInfo.className = "room-info";
                    roomInfo.innerHTML = `
                    <div class="room-info">
                            <h2 class="room-name"> ${room.nameShort.toUpperCase()} - ${room.roomName.charAt(0).toUpperCase() + room.roomName.slice(1).toLowerCase()}</h2>
                    </div>
                    `;

                    if (room.roomTypes.length > 1) {
                        roomInfo.innerHTML += `
                            <p class="room-types">${room.roomTypes.join("<br>")}</p>
                        `;
                    }
                    else {
                        roomInfo.innerHTML += `
                            <p class="room-types">${room.roomTypes[0]}</p>
                        `;
                    }

                    const editDiv = document.createElement("div");
                    editDiv.className = "room-edit";
                    editDiv.innerHTML = `<i class="fa-solid fa-pencil"></i>`;
                    


                    roomBox.appendChild(roomInfo);
                    roomBox.appendChild(editDiv);
                    
                    gridContainer.appendChild(roomBox);

                    if (roomsContainer) roomsContainer.appendChild(gridContainer);
                });
                
                const breakDiv = document.createElement("div");
                breakDiv.style.height = "6vh";
                breakDiv.innerHTML = "&nbsp;";

                if (roomsContainer) roomsContainer.appendChild(breakDiv);
            }
        })
        .catch(err => console.error(err));
}


// Search functionality for Rooms
function searchRooms() {
    const inputEl = document.getElementById("input-field") as HTMLInputElement | null;
    if (!inputEl) return;
    let query = inputEl.value.toLowerCase();
    let rows = document.querySelectorAll(".room-box");

    rows.forEach(function (row) {
        const nameEl = row.querySelector(".room-name");
        const typesEl = row.querySelector(".room-types");
        if (!nameEl || !typesEl) return;
        
        let name = nameEl.textContent?.toLowerCase() || "";
        let types = typesEl.textContent?.toLowerCase() || "";

        if (query === "" || name.includes(query) || types.includes(query)) {
            (row as HTMLElement).style.display = "";
        }
        else {
            (row as HTMLElement).style.display = "none";
        }
    });
}


// Initialize the application
function initializeApp() {
    loadRooms();
    initNavbar();

    const addBtn = document.getElementById("add-btn");
    addBtn?.addEventListener("click", loadAddRoomForm);
}

document.addEventListener("DOMContentLoaded", initializeApp);
const inputField = document.getElementById("input-field");
if (inputField) {
    inputField.addEventListener("input", searchRooms);
}*/
import initNavbar from "./navbar.js";
import { fetchRooms, createRoom } from "../api/roomApi.js";
import { getElement } from "../utils/elementHelpers.js";
import { openModal, closeModal } from "../components/popup.js";
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
function collectRoomFormData(getSelectedTypes) {
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
        roomTypes: getSelectedTypes(),
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
    openModal({
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
        closeModal({
            modal: addRoomScreen,
            overlay,
            scrollContainer: displayRooms,
        });
    });
    confirmButton.addEventListener("click", async () => {
        try {
            const roomData = collectRoomFormData(roomTypeSelector.getSelectedTypes);
            if (!roomData) {
                return;
            }
            await createRoom(roomData);
            closeModal({
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
