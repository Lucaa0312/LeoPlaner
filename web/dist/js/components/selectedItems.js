export function createChip({ label, className, onRemove }) {
    const chip = document.createElement("div");
    chip.className = className;
    const text = document.createElement("span");
    text.textContent = label;
    const remove = document.createElement("span");
    remove.className = "remove-chip";
    remove.textContent = "×";
    chip.append(text, remove);
    chip.addEventListener("click", () => {
        onRemove();
        chip.remove();
    });
    return chip;
}
