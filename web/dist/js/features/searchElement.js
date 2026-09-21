import { getElement } from "../utils/elementHelpers.js";
// Filters rows by the text of the given child selectors. Rows that do not
// match get `hidden`; returns how many are still visible.
export function applySearch({ inputId, rowSelector, values, noResultsEl, onFilter }) {
    const inputEl = getElement(inputId);
    const query = inputEl?.value.toLowerCase().trim() ?? "";
    const rows = document.querySelectorAll(rowSelector);
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
        if (matches)
            visible++;
    });
    if (noResultsEl) {
        noResultsEl.hidden = !(rows.length > 0 && visible === 0);
    }
    onFilter?.(visible, rows.length);
    return { visible, total: rows.length, query };
}
// Attaches the live filter to the input once; re-run `applySearch` after the
// list is re-rendered so a pending query keeps applying.
export function bindSearch(binding) {
    const inputEl = getElement(binding.inputId);
    if (!inputEl || inputEl.dataset.searchBound)
        return;
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
export function initSearchElement({ inputId, selectedRow, values }) {
    applySearch({ inputId, rowSelector: selectedRow, values });
}
