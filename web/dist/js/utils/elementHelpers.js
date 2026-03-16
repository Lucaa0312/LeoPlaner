export function getElement(id) {
    return document.getElementById(id);
}
export function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Element with id "${id}" not found.`);
    }
    return element;
}
