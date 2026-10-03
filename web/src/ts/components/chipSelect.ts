export type ChipOption = {
    value: string;
    label: string;
};

export type ChipSelect = {
    element: HTMLElement;
    getSelected: () => string[];
};

// Multi select shown as toggle chips (room types, subjects).
export function createChipSelect(options: ChipOption[], initiallySelected: string[]): ChipSelect {
    const container = document.createElement("div");
    container.className = "chip-list";

    const selected = new Set<string>();
    for (const value of initiallySelected) {
        selected.add(value);
    }

    for (const option of options) {
        container.appendChild(createChipButton(option));
    }

    function createChipButton(option: ChipOption): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chip-option";
        button.textContent = option.label;

        if (selected.has(option.value)) {
            button.classList.add("selected");
        }

        function handleChipClick(): void {
            if (selected.has(option.value)) {
                selected.delete(option.value);
                button.classList.remove("selected");
            } else {
                selected.add(option.value);
                button.classList.add("selected");
            }
        }

        button.addEventListener("click", handleChipClick);
        return button;
    }

    function getSelected(): string[] {
        const result: string[] = [];
        for (const option of options) {
            if (selected.has(option.value)) {
                result.push(option.value);
            }
        }
        return result;
    }

    return { element: container, getSelected };
}

// Read-only chips for table cells.
export function createChipList(labels: string[]): HTMLElement {
    const list = document.createElement("div");
    list.className = "chip-list";

    for (const label of labels) {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = label;
        list.appendChild(chip);
    }

    return list;
}
