export function toggleEmptyState(element: HTMLElement, hasItems: boolean): void {
    element.style.display = hasItems ? "none" : "block";
}