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
