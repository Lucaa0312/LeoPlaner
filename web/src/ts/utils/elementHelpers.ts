export function getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

export function clearElement(element: HTMLElement): void {
    element.replaceChildren();
}

export function show(element: HTMLElement): void {
    element.style.display = "block";
}

export function hide(element: HTMLElement): void {
    element.style.display = "none";
}