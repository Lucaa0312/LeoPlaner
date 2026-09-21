import { createChip } from "../components/selectedItems.js";
import type { RoomType } from "../types/room.js";

const ALL_ROOM_TYPES: RoomType[] = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];

// Human-readable labels for the backend enum values.
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
    CLASSROOM: "Klassenraum",
    EDV: "EDV",
    CHEM: "Chemie",
    PHY: "Physik",
    SPORT: "Sport",
    WORKSHOP: "Werkstatt",
};

export function roomTypeLabel(type: string): string {
    return (ROOM_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

type RoomTypeSelectorElements = {
    input: HTMLInputElement;
    dropdown: HTMLElement;
    selectedContainer: HTMLElement;
    inputContainer: HTMLElement;
};

export function initRoomTypeSelector({ input, dropdown, selectedContainer, inputContainer }: RoomTypeSelectorElements) {
    let selectedTypes: RoomType[] = [];

    function clearDropdown(): void {
        dropdown.replaceChildren();
    }

    function getSelectedTypes(): RoomType[] {
        return selectedTypes;
    }

    function reset(): void {
        selectedTypes = [];
        input.value = "";
        clearDropdown();
        selectedContainer.replaceChildren();
    }

    function addType(type: RoomType): void {
        if (selectedTypes.includes(type)) {
            return;
        }

        selectedTypes.push(type);

        const chip = createChip({
            label: roomTypeLabel(type),
            className: "roomtype-chip",
            onRemove: () => {
                selectedTypes = selectedTypes.filter((selectedType) => selectedType !== type);
            },
        });

        selectedContainer.appendChild(chip);
    }

    function showMatchingTypes(): void {
        const query = input.value.toUpperCase().trim();
        clearDropdown();

        // With only a handful of room types it is friendlier to list them all
        // as soon as the field is focused instead of requiring a query.
        const matches = ALL_ROOM_TYPES.filter((type) => {
            const matchesQuery =
                type.includes(query) || roomTypeLabel(type).toUpperCase().includes(query);
            return matchesQuery && !selectedTypes.includes(type);
        });

        if (matches.length === 0 && query === "") {
            return;
        }

        if (matches.length === 0) {
            const noResult = document.createElement("div");
            noResult.className = "dropdown-item is-empty";
            noResult.textContent = "Keine Raumtypen gefunden";
            dropdown.appendChild(noResult);
            return;
        }

        matches.forEach((type) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.setAttribute("role", "option");
            item.innerHTML = `<span class="badge badge--mono">${type}</span>`;
            item.append(document.createTextNode(" " + roomTypeLabel(type)));

            item.addEventListener("click", () => {
                addType(type);
                input.value = "";
                clearDropdown();
            });

            dropdown.appendChild(item);
        });
    }
    function restore(type: RoomType): void {
        addType(type); 
    }

    input.addEventListener("input", showMatchingTypes);
    input.addEventListener("focus", showMatchingTypes);

    document.addEventListener("click", (event) => {
        const target = event.target as Element | null;

        if (!target?.closest(`#${inputContainer.id}`)) {
            clearDropdown();
        }
    });

    return {
        getSelectedTypes,
        reset,
        restore,
    };
}