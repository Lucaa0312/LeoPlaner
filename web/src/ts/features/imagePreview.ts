import { getElement } from "../utils/elementHelpers.js";

export function imagePreview(): void {
    const input = getElement<HTMLInputElement>("teacher-image-input");
    const preview = getElement<HTMLImageElement>("avatar-preview");

    if (!input || !preview) return;

    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
        preview.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    });
}