export function getElement(id) {
    return document.getElementById(id);
}
export function aquireElement(id) {
    const element = getElement(id);
    if (!element) {
        throw new Error(`Element with id "${id}" not found.`);
    }
    return element;
}
export function formatName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}
