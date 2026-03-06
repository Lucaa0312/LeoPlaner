export function openModal({ modal, overlay, scrollContainer }) {
    overlay.style.display = "block";
    scrollContainer.style.overflowY = "hidden";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
}
export function closeModal({ modal, overlay, scrollContainer }) {
    modal.style.display = "none";
    overlay.style.display = "none";
    scrollContainer.style.overflowY = "scroll";
}
