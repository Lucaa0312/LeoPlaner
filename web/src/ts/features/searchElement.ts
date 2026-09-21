import { getElement } from "../utils/elementHelpers.js";

type searchElementOptions = {
    inputId: string;
    selectedRow: string;
    values: string[];
};

type SearchBinding = {
    inputId: string;
    rowSelector: string;
    values: string[];
    // element shown when the query matches nothing (the "Keine Treffer" state)
    noResultsEl?: HTMLElement | null;
    onFilter?: (visible: number, total: number) => void;
};

type SearchResult = { visible: number; total: number; query: string };

// Filters rows by the text of the given child selectors. Rows that do not
// match get `hidden`; returns how many are still visible.
export function applySearch({ inputId, rowSelector, values, noResultsEl, onFilter }: SearchBinding): SearchResult {
    const inputEl = getElement<HTMLInputElement>(inputId);
    const query = inputEl?.value.toLowerCase().trim() ?? "";
    const rows = document.querySelectorAll<HTMLElement>(rowSelector);

    let visible = 0;

    rows.forEach((row) => {
        let matches = query === "";

        if (!matches) {
            for (const value of values) {
                const text = Array.from(row.querySelectorAll(value))
                    .map((el) => el.textContent ?? "")
                    .join(" ")
                    .toLowerCase();

                if (text.includes(query)) {
                    matches = true;
                    break;
                }
            }
        }

        row.hidden = !matches;
        if (matches) visible++;
    });

    if (noResultsEl) {
        noResultsEl.hidden = !(rows.length > 0 && visible === 0);
    }

    onFilter?.(visible, rows.length);
    return { visible, total: rows.length, query };
}

// Attaches the live filter to the input once; re-run `applySearch` after the
// list is re-rendered so a pending query keeps applying.
export function bindSearch(binding: SearchBinding): void {
    const inputEl = getElement<HTMLInputElement>(binding.inputId);
    if (!inputEl || inputEl.dataset.searchBound) return;

    inputEl.dataset.searchBound = "true";
    inputEl.addEventListener("input", () => applySearch(binding));

    inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && inputEl.value) {
            inputEl.value = "";
            applySearch(binding);
        }
    });
}

// Backwards-compatible entry point used by the older page scripts.
export function initSearchElement({ inputId, selectedRow, values }: searchElementOptions): void {
    applySearch({ inputId, rowSelector: selectedRow, values });
}
