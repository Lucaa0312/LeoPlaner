export function getElement<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
}

export function aquireElement<T extends HTMLElement>(id: string): T {
    const element = getElement<T>(id);

    if (!element) {
        throw new Error(`Element with id "${id}" not found.`);
    }

    return element;
}


export function formatName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}