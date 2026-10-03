type ConfirmOptions = {
    title: string;
    text: string;
    confirmLabel: string;
};

// Opens a dialog and resolves with true when the user confirms and false when the user cancels.
export function askConfirmation({ title, text, confirmLabel }: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "dialog-overlay";

        const dialog = document.createElement("div");
        dialog.className = "dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");

        const titleElement = document.createElement("h2");
        titleElement.className = "dialog-title";
        titleElement.textContent = title;

        const textElement = document.createElement("p");
        textElement.textContent = text;

        const actions = document.createElement("div");
        actions.className = "dialog-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "btn";
        cancelButton.textContent = "Abbrechen";

        const confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.className = "btn btn-danger";
        confirmButton.textContent = confirmLabel;

        function close(confirmed: boolean): void {
            document.removeEventListener("keydown", handleKeyDown);
            overlay.remove();
            resolve(confirmed);
        }

        function handleCancelClick(): void {
            close(false);
        }

        function handleConfirmClick(): void {
            close(true);
        }

        function handleKeyDown(event: KeyboardEvent): void {
            if (event.key === "Escape") {
                close(false);
            }
        }

        cancelButton.addEventListener("click", handleCancelClick);
        confirmButton.addEventListener("click", handleConfirmClick);
        document.addEventListener("keydown", handleKeyDown);

        actions.append(cancelButton, confirmButton);
        dialog.append(titleElement, textElement, actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        cancelButton.focus();
    });
}
