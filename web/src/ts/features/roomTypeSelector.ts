import { createChip } from "../components/selectedItems.js";
import type { RoomType } from "../types/room.js";

const ALL_ROOM_TYPES: RoomType[] = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];

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
            label: type,
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

        if (query === "") {
            return;
        }

        const matches = ALL_ROOM_TYPES.filter((type) => {
            return type.includes(query) && !selectedTypes.includes(type);
        });

        if (matches.length === 0) {
            const noResult = document.createElement("div");
            noResult.className = "dropdown-item";
            noResult.textContent = "Keine Raumtypen gefunden";
            dropdown.appendChild(noResult);
            return;
        }

        matches.forEach((type) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = type;

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