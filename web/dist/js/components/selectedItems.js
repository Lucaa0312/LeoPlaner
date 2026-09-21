// A removable chip (selected subject, room type …). Clicking anywhere on it
// removes it – the × is a visual affordance, the whole chip is the button.
export function createChip({ label, className = "", onRemove }) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip chip--soft chip--removable ${className}`.trim();
    chip.title = `${label} entfernen`;
    chip.setAttribute("aria-label", `${label} entfernen`);
    const text = document.createElement("span");
    text.textContent = label;
    const remove = document.createElement("span");
    remove.className = "remove-chip";
    remove.setAttribute("aria-hidden", "true");
    remove.innerHTML = `<i class="ti ti-x"></i>`;
    chip.append(text, remove);
    chip.addEventListener("click", () => {
        onRemove();
        chip.remove();
    });
    return chip;
}
