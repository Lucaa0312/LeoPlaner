import { createChip } from "../components/selectedItems.js";
const ALL_ROOM_TYPES = ["CLASSROOM", "EDV", "CHEM", "PHY", "SPORT", "WORKSHOP"];
export function initRoomTypeSelector({ input, dropdown, selectedContainer, inputContainer }) {
    let selectedTypes = [];
    function clearDropdown() {
        dropdown.replaceChildren();
    }
    function getSelectedTypes() {
        return selectedTypes;
    }
    function reset() {
        selectedTypes = [];
        input.value = "";
        clearDropdown();
        selectedContainer.replaceChildren();
    }
    function addType(type) {
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
    function showMatchingTypes() {
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
    input.addEventListener("input", showMatchingTypes);
    document.addEventListener("click", (event) => {
        const target = event.target;
        if (!target?.closest(`#${inputContainer.id}`)) {
            clearDropdown();
        }
    });
    return {
        getSelectedTypes,
        reset,
    };
}
