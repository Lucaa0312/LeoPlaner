import { initAppShell } from "../components/appShell.js";
import { createPageHeader, setPageKicker } from "../components/pageHeader.js";
import {
    createActionsCell,
    createDataTable,
    createElementCell,
    createEmptyRow,
    createSearchBox,
    createTextCell,
    matchesSearch,
} from "../components/dataTable.js";
import { createSidePanel, createFormField, createTextInput } from "../components/sidePanel.js";
import { createChipList, createChipSelect } from "../components/chipSelect.js";
import type { ChipOption } from "../components/chipSelect.js";
import { askConfirmation } from "../components/confirmDialog.js";
import { showToast } from "../components/toast.js";
import { fetchRooms, createRoom, updateRoom, deleteRoom } from "../api/roomApi.js";
import { aquireElement } from "../utils/elementHelpers.js";
import { ROOM_TYPES } from "../types/room.js";
import type { CreateRoomRequest, Room, RoomType } from "../types/room.js";

const COLUMNS = ["Nummer", "Name", "Kürzel", "Raumtypen"];

let rooms: Room[] = [];
let searchQuery = "";
let editingRoomId: number | null = null;
let tableBody: HTMLTableSectionElement | null = null;
let panelSlot: HTMLElement | null = null;

function formatRoomLabel(room: Room): string {
    return `${room.nameShort} · ${room.roomName}`;
}

function buildPage(): void {
    const page = aquireElement<HTMLElement>("page");

    const header = createPageHeader({
        kicker: "Stammdaten",
        title: "Räume",
        actions: [{ id: "add-btn", icon: "ti-plus", label: "Neu: Raum", primary: true }],
    });

    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.appendChild(createSearchBox(handleSearch));

    const layout = document.createElement("div");
    layout.className = "table-layout";

    const table = createDataTable(COLUMNS);
    tableBody = table.body;

    panelSlot = document.createElement("div");
    panelSlot.className = "hidden";

    layout.append(table.element, panelSlot);
    page.replaceChildren(header, toolbar, layout);

    const addButton = aquireElement<HTMLButtonElement>("add-btn");
    addButton.addEventListener("click", handleAddClick);
}

function handleSearch(query: string): void {
    searchQuery = query;
    renderRows();
}

function handleAddClick(): void {
    openRoomForm(null);
}

async function loadAndRenderRooms(): Promise<void> {
    try {
        rooms = await fetchRooms();
    } catch (error) {
        console.error("Fehler beim Laden der Räume:", error);
        rooms = [];
    }

    setPageKicker(`Stammdaten · ${rooms.length} Einträge`);
    renderRows();
}

function renderRows(): void {
    if (!tableBody) {
        return;
    }

    tableBody.replaceChildren();

    for (const room of rooms) {
        const texts = [String(room.roomNumber), room.roomName, room.nameShort, room.roomTypes.join(" ")];
        if (matchesSearch(searchQuery, texts)) {
            tableBody.appendChild(createRoomRow(room));
        }
    }

    if (tableBody.children.length === 0) {
        tableBody.appendChild(createEmptyRow(COLUMNS.length, "Keine Einträge gefunden."));
    }
}

function createRoomRow(room: Room): HTMLTableRowElement {
    const row = document.createElement("tr");

    if (room.id === editingRoomId) {
        row.className = "selected";
    }

    let typesCell: HTMLTableCellElement;
    if (room.roomTypes.length > 0) {
        typesCell = createElementCell(createChipList(room.roomTypes));
    } else {
        typesCell = createTextCell("kein Typ", "text-bad");
    }

    function handleEditClick(): void {
        openRoomForm(room);
    }

    function handleDeleteClick(): void {
        void confirmAndDeleteRoom(room);
    }

    row.append(
        createTextCell(String(room.roomNumber), "mono"),
        createTextCell(room.roomName, "strong"),
        createTextCell(room.nameShort, "mono"),
        typesCell,
        createActionsCell(handleEditClick, handleDeleteClick),
    );

    return row;
}

function openRoomForm(room: Room | null): void {
    if (!panelSlot) {
        return;
    }

    let title = "Neuer Raum";
    let numberValue = "";
    let nameValue = "";
    let shortValue = "";
    let selectedTypes: string[] = ["CLASSROOM"];

    if (room) {
        title = "Raum bearbeiten";
        numberValue = String(room.roomNumber);
        nameValue = room.roomName;
        shortValue = room.nameShort;
        selectedTypes = room.roomTypes;
        editingRoomId = room.id;
    } else {
        editingRoomId = null;
    }

    const numberInput = createTextInput(numberValue, "z. B. 124", true);
    const nameInput = createTextInput(nameValue, "z. B. EDV-Saal 1", false);
    const shortInput = createTextInput(shortValue, "z. B. E58", true);

    const typeOptions: ChipOption[] = [];
    for (const type of ROOM_TYPES) {
        typeOptions.push({ value: type, label: type });
    }
    const typeSelect = createChipSelect(typeOptions, selectedTypes);

    const panel = createSidePanel({ title, onSave: handleSaveClick, onCancel: closeRoomForm });

    panel.body.append(
        createFormField("Nummer", numberInput, ""),
        createFormField("Name", nameInput, ""),
        createFormField("Kürzel", shortInput, ""),
        createFormField("Raumtypen", typeSelect.element, "Mindestens ein Typ. Mehrere sind möglich."),
    );

    async function handleSaveClick(): Promise<void> {
        panel.clearError();

        const name = nameInput.value.trim();
        const short = shortInput.value.trim();
        const roomNumber = Number(numberInput.value.trim());
        const types = typeSelect.getSelected() as RoomType[];

        if (name === "" || short === "") {
            panel.showError("Bitte Name und Kürzel ausfüllen.");
            return;
        }
        if (numberInput.value.trim() === "" || !Number.isInteger(roomNumber)) {
            panel.showError("Die Nummer muss eine ganze Zahl sein.");
            return;
        }
        if (types.length === 0) {
            panel.showError("Ein Raum braucht mindestens einen Raumtyp.");
            return;
        }

        const roomData: CreateRoomRequest = {
            roomName: name,
            roomNumber: roomNumber,
            nameShort: short,
            roomTypes: types,
        };

        panel.setSaving(true);
        try {
            if (room) {
                await updateRoom(room.id, roomData);
            } else {
                await createRoom(roomData);
            }
        } catch (error) {
            console.error("Fehler beim Speichern des Raums:", error);
            panel.showError("Speichern fehlgeschlagen.");
            panel.setSaving(false);
            return;
        }

        closeRoomForm();
        showToast("Raum gespeichert");
        await loadAndRenderRooms();
    }

    panelSlot.replaceChildren(panel.element);
    panelSlot.className = "";
    renderRows();
    nameInput.focus();
}

function closeRoomForm(): void {
    if (!panelSlot) {
        return;
    }

    editingRoomId = null;
    panelSlot.replaceChildren();
    panelSlot.className = "hidden";
    renderRows();
}

async function confirmAndDeleteRoom(room: Room): Promise<void> {
    const confirmed = await askConfirmation({
        title: `Raum „${formatRoomLabel(room)}“ löschen?`,
        text: "Das kann nicht rückgängig gemacht werden.",
        confirmLabel: "Löschen",
    });

    if (!confirmed) {
        return;
    }

    try {
        await deleteRoom(room.id);
    } catch (error) {
        console.error("Fehler beim Löschen des Raums:", error);
        showToast("Löschen fehlgeschlagen.");
        return;
    }

    if (editingRoomId === room.id) {
        closeRoomForm();
    }
    showToast("Raum gelöscht");
    await loadAndRenderRooms();
}

function initializeApp(): void {
    initAppShell("rooms");
    buildPage();
    void loadAndRenderRooms();
}

document.addEventListener("DOMContentLoaded", initializeApp);
