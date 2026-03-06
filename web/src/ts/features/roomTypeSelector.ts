import { createChip } from "../components/selectedItems.js";
import type { RoomType } from "../types/room.js";

const ALL_ROOM_TYPES: RoomType[] = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];

type RoomTypeSelectorElements = {
    input: HTMLInputElement;
    dropdown: HTMLElement;
    selectedContainer: HTMLElement;
    inputContainer: HTMLElement;
};

export type RoomTypeSelector = {
    getSelectedTypes: () => RoomType[];
    reset: () => void;
};

export function initRoomTypeSelector(elements: RoomTypeSelectorElements): RoomTypeSelector {
    const selectedTypes = new Set<RoomType>();

    function renderDropdown(query: string): void {
        elements.dropdown.replaceChildren();

        if (!query) {
            return;
        }

        const matches = ALL_ROOM_TYPES.filter(
            (type) => type.includes(query) && !selectedTypes.has(type)
        );

        if (matches.length === 0) {
            const noResult = document.createElement("div");
            noResult.className = "dropdown-item";
            noResult.textContent = "Keine Raumtypen gefunden";
            elements.dropdown.appendChild(noResult);
            return;
        }

        for (const type of matches) {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = type;

            item.addEventListener("click", () => {
                addType(type);
                elements.dropdown.replaceChildren();
                elements.input.value = "";
            });

            elements.dropdown.appendChild(item);
        }
    }

    function addType(type: RoomType): void {
        if (selectedTypes.has(type)) {
            return;
        }

        selectedTypes.add(type);

        const chip = createChip({
            label: type,
            className: "roomtype-chip",
            onRemove: () => {
                selectedTypes.delete(type);
            },
        });

        elements.selectedContainer.appendChild(chip);
    }

    elements.input.addEventListener("input", () => {
        const query = elements.input.value.toUpperCase().trim();
        renderDropdown(query);
    });

    document.addEventListener("click", (event) => {
        const target = event.target as Element | null;
        if (!target?.closest(`#${elements.inputContainer.id}`)) {
            elements.dropdown.replaceChildren();
        }
    });

    return {
        getSelectedTypes: () => Array.from(selectedTypes),
        reset: () => {
            selectedTypes.clear();
            elements.input.value = "";
            elements.dropdown.replaceChildren();
            elements.selectedContainer.replaceChildren();
        },
    };
}