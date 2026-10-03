// Table inside its card. The last header cell stays empty for the edit and delete buttons.
export function createDataTable(columns) {
    const card = document.createElement("div");
    card.className = "table-card";
    const table = document.createElement("table");
    table.className = "data-table";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const column of columns) {
        const cell = document.createElement("th");
        cell.textContent = column;
        headRow.appendChild(cell);
    }
    headRow.appendChild(document.createElement("th"));
    head.appendChild(headRow);
    const body = document.createElement("tbody");
    table.append(head, body);
    card.appendChild(table);
    return { element: card, body };
}
export function createTextCell(text, className) {
    const cell = document.createElement("td");
    cell.textContent = text;
    if (className !== "") {
        cell.className = className;
    }
    return cell;
}
export function createElementCell(content) {
    const cell = document.createElement("td");
    cell.appendChild(content);
    return cell;
}
export function createActionsCell(onEdit, onDelete) {
    const cell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-btn";
    editButton.title = "Bearbeiten";
    editButton.innerHTML = `<i class="ti ti-pencil"></i>`;
    editButton.addEventListener("click", onEdit);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-btn danger";
    deleteButton.title = "Löschen";
    deleteButton.innerHTML = `<i class="ti ti-trash"></i>`;
    deleteButton.addEventListener("click", onDelete);
    actions.append(editButton, deleteButton);
    cell.appendChild(actions);
    return cell;
}
export function createEmptyRow(columnCount, text) {
    const row = document.createElement("tr");
    row.className = "empty-row";
    const cell = document.createElement("td");
    cell.colSpan = columnCount + 1;
    cell.textContent = text;
    row.appendChild(cell);
    return row;
}
export function createSearchBox(onInput) {
    const box = document.createElement("label");
    box.className = "search-box";
    const icon = document.createElement("i");
    icon.className = "ti ti-search";
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Suchen …";
    function handleSearchInput() {
        onInput(input.value.trim().toLowerCase());
    }
    input.addEventListener("input", handleSearchInput);
    box.append(icon, input);
    return box;
}
// true when the search is empty or one of the texts contains it (query is already lower case).
export function matchesSearch(query, texts) {
    if (query === "") {
        return true;
    }
    for (const text of texts) {
        if (text.toLowerCase().includes(query)) {
            return true;
        }
    }
    return false;
}
