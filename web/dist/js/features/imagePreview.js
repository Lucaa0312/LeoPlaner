import { getElement } from "../utils/elementHelpers.js";
export function imagePreview() {
    const input = getElement("teacher-image-input");
    const preview = getElement("avatar-preview");
    if (!input || !preview)
        return;
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = () => {
            preview.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
