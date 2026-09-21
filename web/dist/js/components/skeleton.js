// Loading skeletons shown while a page's first fetch is pending.
//
//   renderSkeleton(container, 6, "row");   // table-like placeholders
//   renderSkeleton(container, 8, "card");  // card-grid placeholders
//   clearSkeleton(container);
const SKELETON_ATTR = "data-skeleton";
function buildRow() {
    const row = document.createElement("div");
    row.className = "skeleton-row";
    row.innerHTML = `
    <span class="skeleton skeleton--circle"></span>
    <span class="skeleton" style="width: 70%"></span>
    <span class="skeleton" style="width: 45%"></span>
    <span class="skeleton skeleton--pill" style="width: 80%"></span>
    <span class="skeleton" style="width: 40%"></span>
    <span class="skeleton" style="width: 1.5rem"></span>`;
    return row;
}
function buildCard() {
    const card = document.createElement("div");
    card.className = "skeleton-card";
    card.innerHTML = `
    <span class="skeleton skeleton--bar"></span>
    <span class="skeleton skeleton--title"></span>
    <span class="skeleton" style="width: 40%"></span>
    <span class="skeleton skeleton--pill" style="width: 55%; height: 1.25rem; border-radius: 999px"></span>`;
    return card;
}
export function renderSkeleton(target, count, kind = "row") {
    clearSkeleton(target);
    const wrapper = document.createElement("div");
    wrapper.setAttribute(SKELETON_ATTR, kind);
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.className = kind === "row" ? "skeleton-rows" : "entity-grid";
    for (let i = 0; i < count; i++) {
        wrapper.appendChild(kind === "row" ? buildRow() : buildCard());
    }
    target.appendChild(wrapper);
    target.setAttribute("aria-busy", "true");
}
export function clearSkeleton(target) {
    target
        .querySelectorAll(`[${SKELETON_ATTR}]`)
        .forEach((node) => node.remove());
    target.removeAttribute("aria-busy");
}
