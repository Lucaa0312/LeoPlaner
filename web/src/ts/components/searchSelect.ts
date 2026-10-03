import type { SelectOption } from "./sidePanel.js";
import { matchesSearch } from "./dataTable.js";

// Selection lists with a search field, for long lists (70 classes, 180 teachers, 150 subjects).
// A native <select> can only jump by first letters. Two variants share the search popup:
// - createSearchSelect: one value, the list closes after a pick
// - createSearchMultiSelect: several values shown as chips, the list stays open while picking

export type SearchSelect = {
    element: HTMLElement;
    getValue: () => string;
    // Replaces the entries, shown sorted by label. pinnedOption (e.g. "Alle Klassen") stays first.
    setOptions: (options: SelectOption[], selectedValue: string, pinnedOption?: SelectOption) => void;
};

export type MultiOption = {
    value: string;
    // shown in the list and searched, e.g. "0RI · Religion Islam"
    label: string;
    // shown on the chip of a chosen entry, e.g. "0RI"
    chipLabel: string;
};

export type SearchMultiSelect = {
    element: HTMLElement;
    // chosen values in list order, like chipSelect
    getSelected: () => string[];
};

type PopupConfig = {
    onPick: (option: SelectOption) => void;
    isMarked: (option: SelectOption) => boolean;
    // multi select: the list stays open and marked entries get a check mark
    multi: boolean;
};

type SearchPopup = {
    element: HTMLElement;
    open: (activeValue: string) => void;
    close: () => void;
    isOpen: () => boolean;
    setOptions: (options: SelectOption[]) => void;
    refresh: () => void;
};

function compareOptions(first: SelectOption, second: SelectOption): number {
    return first.label.localeCompare(second.label, "de", { numeric: true });
}

function sortOptions(options: SelectOption[]): SelectOption[] {
    const sorted = [...options];
    sorted.sort(compareOptions);
    return sorted;
}

// Search field plus list. wrapper is the element a click outside of closes the list,
// button gets the focus back when the list is closed by keyboard.
function createSearchPopup(wrapper: HTMLElement, button: HTMLButtonElement, config: PopupConfig): SearchPopup {
    const popup = document.createElement("div");
    popup.className = "search-select-popup hidden";

    const searchBox = document.createElement("label");
    searchBox.className = "search-box search-select-search";
    searchBox.innerHTML = `<i class="ti ti-search"></i>`;

    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Suchen …";
    searchBox.appendChild(input);

    const list = document.createElement("ul");
    list.className = "search-select-list";

    popup.append(searchBox, list);

    let options: SelectOption[] = [];
    let filtered: SelectOption[] = [];
    let activeIndex = 0;

    function filterOptions(): void {
        const query = input.value.trim().toLowerCase();
        filtered = [];
        for (const option of options) {
            if (matchesSearch(query, [option.label])) {
                filtered.push(option);
            }
        }
    }

    function renderList(): void {
        list.replaceChildren();

        if (filtered.length === 0) {
            const empty = document.createElement("li");
            empty.className = "search-select-empty";
            empty.textContent = "Keine Treffer";
            list.appendChild(empty);
            return;
        }

        for (let index = 0; index < filtered.length; index++) {
            list.appendChild(createItem(filtered[index]!, index));
        }

        const activeItem = list.children[activeIndex];
        if (activeItem) {
            activeItem.scrollIntoView({ block: "nearest" });
        }
    }

    function createItem(option: SelectOption, index: number): HTMLLIElement {
        const item = document.createElement("li");
        item.className = "search-select-item";

        if (config.multi) {
            const check = document.createElement("i");
            check.className = "ti ti-check search-select-check";
            item.appendChild(check);
        }

        const label = document.createElement("span");
        label.textContent = option.label;
        item.appendChild(label);

        if (index === activeIndex) {
            item.classList.add("active");
        }
        if (config.isMarked(option)) {
            item.classList.add("selected");
        }

        function handleItemClick(): void {
            activeIndex = index;
            pick(option);
        }

        item.addEventListener("click", handleItemClick);
        return item;
    }

    function pick(option: SelectOption): void {
        if (config.multi) {
            config.onPick(option);
            renderList();
            input.focus();
        } else {
            close();
            button.focus();
            config.onPick(option);
        }
    }

    function findFilteredIndex(value: string): number {
        for (let index = 0; index < filtered.length; index++) {
            if (filtered[index]!.value === value) {
                return index;
            }
        }
        return 0;
    }

    function isOpen(): boolean {
        return !popup.classList.contains("hidden");
    }

    function open(activeValue: string): void {
        if (options.length === 0) {
            return;
        }

        input.value = "";
        filterOptions();
        activeIndex = findFilteredIndex(activeValue);
        popup.classList.remove("hidden");
        renderList();
        input.focus();
        document.addEventListener("mousedown", handleDocumentMouseDown);
    }

    function close(): void {
        popup.classList.add("hidden");
        document.removeEventListener("mousedown", handleDocumentMouseDown);
    }

    function moveActive(step: number): void {
        if (filtered.length === 0) {
            return;
        }

        activeIndex = activeIndex + step;
        if (activeIndex < 0) {
            activeIndex = 0;
        } else if (activeIndex > filtered.length - 1) {
            activeIndex = filtered.length - 1;
        }
        renderList();
    }

    function handleInput(): void {
        filterOptions();
        activeIndex = 0;
        renderList();
    }

    function handleInputKeyDown(event: KeyboardEvent): void {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveActive(1);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveActive(-1);
        } else if (event.key === "Enter") {
            event.preventDefault();
            const option = filtered[activeIndex];
            if (option) {
                pick(option);
            }
        } else if (event.key === "Escape") {
            event.preventDefault();
            close();
            button.focus();
        }
    }

    function handleDocumentMouseDown(event: MouseEvent): void {
        if (!wrapper.contains(event.target as Node)) {
            close();
        }
    }

    function setOptions(newOptions: SelectOption[]): void {
        options = newOptions;
        close();
    }

    function refresh(): void {
        if (isOpen()) {
            renderList();
        }
    }

    input.addEventListener("input", handleInput);
    input.addEventListener("keydown", handleInputKeyDown);

    return { element: popup, open, close, isOpen, setOptions, refresh };
}

function createSelectButton(className: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `form-input search-select-button ${className}`;
    return button;
}

export function createSearchSelect(onChange: () => void): SearchSelect {
    const wrapper = document.createElement("div");
    wrapper.className = "search-select";

    const button = createSelectButton("");

    const buttonLabel = document.createElement("span");
    buttonLabel.className = "search-select-label";

    const chevron = document.createElement("i");
    chevron.className = "ti ti-chevron-down";

    button.append(buttonLabel, chevron);

    let options: SelectOption[] = [];
    let value = "";

    function isMarked(option: SelectOption): boolean {
        return option.value === value;
    }

    function handlePick(option: SelectOption): void {
        if (option.value === value) {
            return;
        }

        value = option.value;
        showValue();
        onChange();
    }

    const popup = createSearchPopup(wrapper, button, { onPick: handlePick, isMarked, multi: false });
    wrapper.append(button, popup.element);

    function findLabel(optionValue: string): string {
        for (const option of options) {
            if (option.value === optionValue) {
                return option.label;
            }
        }
        return "";
    }

    function showValue(): void {
        const label = findLabel(value);
        if (label === "") {
            buttonLabel.textContent = "Keine Einträge";
            buttonLabel.classList.add("muted");
        } else {
            buttonLabel.textContent = label;
            buttonLabel.classList.remove("muted");
        }
    }

    function handleButtonClick(): void {
        if (popup.isOpen()) {
            popup.close();
        } else {
            popup.open(value);
        }
    }

    function handleButtonKeyDown(event: KeyboardEvent): void {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            popup.open(value);
        }
    }

    function getValue(): string {
        return value;
    }

    function setOptions(newOptions: SelectOption[], selectedValue: string, pinnedOption?: SelectOption): void {
        options = sortOptions(newOptions);
        if (pinnedOption) {
            options.unshift(pinnedOption);
        }
        value = selectedValue;
        popup.setOptions(options);
        showValue();
    }

    button.addEventListener("click", handleButtonClick);
    button.addEventListener("keydown", handleButtonKeyDown);

    showValue();
    return { element: wrapper, getValue, setOptions };
}

export function createSearchMultiSelect(
    multiOptions: MultiOption[],
    initiallySelected: string[],
    addLabel: string,
): SearchMultiSelect {
    const wrapper = document.createElement("div");
    wrapper.className = "search-select search-multi-select";

    const chips = document.createElement("div");
    chips.className = "chip-list";

    const button = createSelectButton("search-select-add");
    button.innerHTML = `<i class="ti ti-plus"></i>`;
    const buttonLabel = document.createElement("span");
    buttonLabel.className = "search-select-label";
    buttonLabel.textContent = addLabel;
    const chevron = document.createElement("i");
    chevron.className = "ti ti-chevron-down";
    button.append(buttonLabel, chevron);

    const options: SelectOption[] = [];
    for (const multiOption of multiOptions) {
        options.push({ value: multiOption.value, label: multiOption.label });
    }
    const sortedOptions = sortOptions(options);

    const selected = new Set<string>();
    for (const value of initiallySelected) {
        selected.add(value);
    }

    function isMarked(option: SelectOption): boolean {
        return selected.has(option.value);
    }

    function handlePick(option: SelectOption): void {
        if (selected.has(option.value)) {
            selected.delete(option.value);
        } else {
            selected.add(option.value);
        }
        renderChips();
    }

    const popup = createSearchPopup(wrapper, button, { onPick: handlePick, isMarked, multi: true });
    popup.setOptions(sortedOptions);

    const anchor = document.createElement("div");
    anchor.className = "search-select";
    anchor.append(button, popup.element);
    wrapper.append(chips, anchor);

    function findChipLabel(value: string): string {
        for (const multiOption of multiOptions) {
            if (multiOption.value === value) {
                return multiOption.chipLabel;
            }
        }
        return value;
    }

    function createChip(value: string): HTMLElement {
        const chip = document.createElement("span");
        chip.className = "chip removable-chip";
        chip.textContent = findChipLabel(value);

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "chip-remove";
        removeButton.title = "Entfernen";
        removeButton.innerHTML = `<i class="ti ti-x"></i>`;

        function handleRemoveClick(): void {
            selected.delete(value);
            renderChips();
            popup.refresh();
        }

        removeButton.addEventListener("click", handleRemoveClick);
        chip.appendChild(removeButton);
        return chip;
    }

    function renderChips(): void {
        chips.replaceChildren();

        for (const value of getSelected()) {
            chips.appendChild(createChip(value));
        }

        if (chips.children.length === 0) {
            const empty = document.createElement("span");
            empty.className = "muted";
            empty.textContent = "Noch keine ausgewählt";
            chips.appendChild(empty);
        }
    }

    function getSelected(): string[] {
        const result: string[] = [];
        for (const option of sortedOptions) {
            if (selected.has(option.value)) {
                result.push(option.value);
            }
        }
        return result;
    }

    function handleButtonClick(): void {
        if (popup.isOpen()) {
            popup.close();
        } else {
            popup.open("");
        }
    }

    button.addEventListener("click", handleButtonClick);
    renderChips();

    return { element: wrapper, getSelected };
}
