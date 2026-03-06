export function getElement(id) {
    return document.getElementById(id);
}
export function clearElement(element) {
    element.replaceChildren();
}
export function show(element) {
    element.style.display = "block";
}
export function hide(element) {
    element.style.display = "none";
}
