import { getElement } from "../utils/elementHelpers.js";

type searchElementOptions = {
    inputId: string;
    selectedRow: string;
    values: string[];
}

export function initSearchElement({ inputId, selectedRow, values }: searchElementOptions): void {
    const inputEl = getElement<HTMLInputElement>(inputId);
    if (!inputEl) {
        return;
    }

    const query = inputEl.value.toLowerCase().trim();
    const rows = document.querySelectorAll(selectedRow);


    rows.forEach((row) => {
        const element = row as HTMLElement;

        let matches = false;
        if (query === "") {
            matches = true;
        }

        for (const value of values) {
        const foundElement = row.querySelector(value);

        let text = "";

        if (foundElement && foundElement.textContent) {
            text = foundElement.textContent.toLowerCase();
        }

        if (text.includes(query)) {
            matches = true;
            break;
        }
    }

    if (matches) {
        element.style.display = "";
    } else {
        element.style.display = "none";
    }
    });

}