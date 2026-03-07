type ModalElements = {
    modal: HTMLElement;
    overlay: HTMLElement;
    scrollContainer: HTMLElement;
};

export function openPopup({ modal, overlay, scrollContainer }: ModalElements): void {
    overlay.style.display = "block";
    scrollContainer.style.overflowY = "hidden";
    modal.style.display = "flex";
    modal.style.flexDirection = "column";
}

export function closePopup({ modal, overlay, scrollContainer }: ModalElements): void {
    modal.style.display = "none";
    overlay.style.display = "none";
    scrollContainer.style.overflowY = "scroll";
}