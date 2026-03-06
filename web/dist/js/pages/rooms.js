import initNavbar from "./navbar.js";
// room types available
const allRoomTypes = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
let selectedRoomTypes = [];
// Function to initialize room type search
function initRoomTypeSearch() {
    const input = document.getElementById("roomtype-input");
    const dropdown = document.getElementById("roomtype-dropdown");
    input.addEventListener("input", () => {
        const query = input.value.toUpperCase().trim();
        dropdown.innerHTML = "";
        if (!query)
            return;
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
        const target = e.target;
        if (!target?.closest("#roomtype-input-container")) {
            dropdown.innerHTML = "";
        }
    });
}
// Function to add a room type chip
function addRoomTypeChip(type) {
    selectedRoomTypes.push(type);
    const container = document.getElementById("selected-roomtypes");
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
        roomName: document.getElementById("name-input")?.value.trim() || "",
        roomNumber: Number(document.getElementById("number-input")?.value || 0),
        roomPrefix: document.getElementById("prefix-input")?.value.trim() || "",
        roomSuffix: document.getElementById("suffix-input")?.value.trim() || "",
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
    const noRooms = document.getElementById("no-rooms");
    if (noRooms)
        noRooms.style.display = "none";
    const disableOverlay = document.getElementById("disable-overlay");
    if (disableOverlay)
        disableOverlay.style.display = "block";
    const displayRooms = document.getElementById("display-rooms");
    if (displayRooms)
        displayRooms.style.overflowY = "hidden";
    const addRoomScreen = document.getElementById("add-room-screen");
    if (addRoomScreen) {
        addRoomScreen.style.display = "flex";
        addRoomScreen.style.flexDirection = "column";
    }
    if (!addRoomScreen)
        return;
    const headerContainer = document.createElement("div");
    headerContainer.id = "add-room-header-container";
    headerContainer.innerHTML = `
    <h1 id="add-room-header">Einen neuen Raum hinzufügen</h1>`;
    const closeScreenButton = document.createElement("div");
    closeScreenButton.id = "close-add-room-screen-btn";
    closeScreenButton.innerHTML = `<i class="fa-regular fa-circle-xmark"></i>`;
    closeScreenButton.onclick = () => {
        if (displayRooms)
            displayRooms.style.overflowY = "scroll";
        if (addRoomScreen)
            addRoomScreen.style.display = "none";
        if (disableOverlay)
            disableOverlay.style.display = "none";
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
        if (addRoomScreen)
            addRoomScreen.style.display = "none";
        if (disableOverlay)
            disableOverlay.style.display = "none";
        if (displayRooms)
            displayRooms.style.overflowY = "scroll";
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
        .then((data) => {
        console.log(data);
        if (!data || data.length === 0) {
            console.log("No rooms found");
            const noRoomsEl = document.getElementById("no-rooms");
            if (noRoomsEl)
                noRoomsEl.style.display = "block";
            return;
        }
        else {
            const noRoomsEl = document.getElementById("no-rooms");
            if (noRoomsEl)
                noRoomsEl.style.display = "none";
            const roomsContainer = document.getElementById("display-rooms");
            if (!roomsContainer)
                return;
            roomsContainer.innerHTML = "";
            const gridContainer = document.createElement("div");
            gridContainer.className = "grid-layout";
            data.forEach((room) => {
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
                if (roomsContainer)
                    roomsContainer.appendChild(gridContainer);
            });
            const breakDiv = document.createElement("div");
            breakDiv.style.height = "6vh";
            breakDiv.innerHTML = "&nbsp;";
            if (roomsContainer)
                roomsContainer.appendChild(breakDiv);
        }
    })
        .catch(err => console.error(err));
}
// Search functionality for Rooms
function searchRooms() {
    const inputEl = document.getElementById("input-field");
    if (!inputEl)
        return;
    let query = inputEl.value.toLowerCase();
    let rows = document.querySelectorAll(".room-box");
    rows.forEach(function (row) {
        const nameEl = row.querySelector(".room-name");
        const typesEl = row.querySelector(".room-types");
        if (!nameEl || !typesEl)
            return;
        let name = nameEl.textContent?.toLowerCase() || "";
        let types = typesEl.textContent?.toLowerCase() || "";
        if (query === "" || name.includes(query) || types.includes(query)) {
            row.style.display = "";
        }
        else {
            row.style.display = "none";
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
}
