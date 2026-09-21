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
// Keeps mixed-case names as they are ("EDV-Saal 1") and only normalises
// names stored entirely in lower- or upper-case.
export function smartCase(name) {
    const trimmed = name.trim();
    const uniform = trimmed === trimmed.toLowerCase() || trimmed === trimmed.toUpperCase();
    if (!uniform)
        return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
