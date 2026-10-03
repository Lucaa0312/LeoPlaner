type SidePanelOptions = {
    title: string;
    onSave: () => void;
    onCancel: () => void;
};

export type SidePanel = {
    element: HTMLElement;
    body: HTMLElement;
    showError: (text: string) => void;
    clearError: () => void;
    setSaving: (saving: boolean) => void;
};

// The edit panel next to a table. The page puts its form fields into `body`.
export function createSidePanel({ title, onSave, onCancel }: SidePanelOptions): SidePanel {
    const panel = document.createElement("section");
    panel.className = "side-panel";

    const header = document.createElement("div");
    header.className = "side-panel-header";

    const titleElement = document.createElement("h2");
    titleElement.className = "side-panel-title";
    titleElement.textContent = title;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "icon-btn";
    closeButton.title = "Schließen";
    closeButton.innerHTML = `<i class="ti ti-x"></i>`;
    closeButton.addEventListener("click", onCancel);

    header.append(titleElement, closeButton);

    const body = document.createElement("div");
    body.className = "panel-body";

    const error = document.createElement("div");
    error.className = "form-error hidden";

    const actions = document.createElement("div");
    actions.className = "panel-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "btn btn-primary";
    saveButton.textContent = "Speichern";
    saveButton.addEventListener("click", onSave);

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "btn";
    cancelButton.textContent = "Abbrechen";
    cancelButton.addEventListener("click", onCancel);

    actions.append(saveButton, cancelButton);
    panel.append(header, body, error, actions);

    function showError(text: string): void {
        error.innerHTML = `<i class="ti ti-alert-circle"></i>`;
        const message = document.createElement("span");
        message.textContent = text;
        error.appendChild(message);
        error.classList.remove("hidden");
    }

    function clearError(): void {
        error.classList.add("hidden");
        error.replaceChildren();
    }

    function setSaving(saving: boolean): void {
        saveButton.disabled = saving;
    }

    return { element: panel, body, showError, clearError, setSaving };
}

// A labeled form row. `control` is the input, select or chip list.
export function createFormField(label: string, control: HTMLElement, hint: string): HTMLElement {
    const field = document.createElement("div");
    field.className = "form-field";

    if (label !== "") {
        const labelElement = document.createElement("span");
        labelElement.className = "form-label";
        labelElement.textContent = label;
        field.appendChild(labelElement);
    }

    field.appendChild(control);

    if (hint !== "") {
        const hintElement = document.createElement("span");
        hintElement.className = "form-hint";
        hintElement.textContent = hint;
        field.appendChild(hintElement);
    }

    return field;
}

export function createTextInput(value: string, placeholder: string, mono: boolean): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-input";
    if (mono) {
        input.classList.add("mono");
    }
    input.value = value;
    input.placeholder = placeholder;
    return input;
}

export type SelectOption = {
    value: string;
    label: string;
};

export function createSelect(options: SelectOption[], selectedValue: string): HTMLSelectElement {
    const select = document.createElement("select");
    select.className = "form-input";
    fillSelect(select, options, selectedValue);
    return select;
}

export function fillSelect(select: HTMLSelectElement, options: SelectOption[], selectedValue: string): void {
    select.replaceChildren();

    for (const option of options) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        if (option.value === selectedValue) {
            optionElement.selected = true;
        }
        select.appendChild(optionElement);
    }
}
