// Empty states.
//
//   renderEmptyState(el, {
//     illustration: "teachers",
//     title: "Noch keine Lehrer",
//     hint: "Legen Sie die erste Lehrkraft an …",
//     ctaLabel: "Lehrer hinzufügen",
//     onCta: () => openForm(),
//   });
//   toggleEmptyState(el, hasItems);

export type Illustration =
  | "teachers"
  | "subjects"
  | "rooms"
  | "classes"
  | "search"
  | "timetable";

export type EmptyStateOptions = {
  illustration: Illustration;
  title: string;
  hint?: string;
  ctaLabel?: string;
  ctaIcon?: string;
  onCta?: () => void;
  compact?: boolean;
};

// Small inline illustrations. They inherit the primary colour through
// `currentColor`; `.art-accent`, `.art-muted` and `.art-surface` pick up
// theme-aware colours from components.css so they work in dark mode too.
const ART: Record<Illustration, string> = {
  teachers: `
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="18" y="14" width="124" height="70" rx="8" class="art-muted" stroke="currentColor" stroke-width="3"/>
      <rect x="18" y="14" width="124" height="70" rx="8" fill="currentColor" opacity=".06"/>
      <path d="M36 36h52M36 50h36M36 64h44" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".35"/>
      <circle cx="112" cy="66" r="14" fill="currentColor" class="art-surface" stroke="currentColor" stroke-width="3"/>
      <circle cx="112" cy="66" r="14" fill="currentColor" opacity=".12"/>
      <path d="M86 112c2-16 12-26 26-26s24 10 26 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="132" cy="30" r="5" fill="currentColor" class="art-accent"/>
    </svg>`,
  subjects: `
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="30" y="76" width="100" height="22" rx="5" stroke="currentColor" stroke-width="3" fill="currentColor" opacity=".08"/>
      <rect x="30" y="76" width="100" height="22" rx="5" stroke="currentColor" stroke-width="3"/>
      <rect x="40" y="50" width="88" height="22" rx="5" stroke="currentColor" stroke-width="3" fill="currentColor" opacity=".16"/>
      <rect x="40" y="50" width="88" height="22" rx="5" stroke="currentColor" stroke-width="3"/>
      <rect x="34" y="24" width="72" height="22" rx="5" stroke="currentColor" stroke-width="3" class="art-accent" fill="currentColor" opacity=".9"/>
      <path d="M50 87h20M60 61h20M48 35h18" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".5"/>
      <circle cx="126" cy="26" r="5" fill="currentColor" class="art-accent"/>
    </svg>`,
  rooms: `
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M40 106V22a6 6 0 0 1 6-6h68a6 6 0 0 1 6 6v84" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <rect x="52" y="28" width="56" height="78" rx="4" fill="currentColor" opacity=".12" stroke="currentColor" stroke-width="3"/>
      <circle cx="96" cy="68" r="4" fill="currentColor" class="art-accent"/>
      <path d="M22 106h116" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".45"/>
      <rect x="62" y="38" width="36" height="20" rx="3" stroke="currentColor" stroke-width="2.5" opacity=".5"/>
      <circle cx="132" cy="30" r="5" fill="currentColor" class="art-accent"/>
    </svg>`,
  classes: `
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M22 54 80 26l58 28-58 28-58-28Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round" fill="currentColor" opacity=".1"/>
      <path d="M22 54 80 26l58 28-58 28-58-28Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
      <path d="M46 66v20c0 6 15 12 34 12s34-6 34-12V66" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M138 54v30" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <circle cx="138" cy="90" r="5" fill="currentColor" class="art-accent"/>
    </svg>`,
  search: `
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="70" cy="54" r="30" stroke="currentColor" stroke-width="3" fill="currentColor" opacity=".08"/>
      <circle cx="70" cy="54" r="30" stroke="currentColor" stroke-width="3"/>
      <path d="M93 77l26 26" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <path d="M56 54h28M70 40v28" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".3" stroke-dasharray="1 7"/>
      <circle cx="122" cy="30" r="5" fill="currentColor" class="art-accent"/>
    </svg>`,
  timetable: `
    <svg viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="24" y="20" width="112" height="84" rx="8" stroke="currentColor" stroke-width="3" fill="currentColor" opacity=".06"/>
      <rect x="24" y="20" width="112" height="84" rx="8" stroke="currentColor" stroke-width="3"/>
      <path d="M24 42h112M52 42v62M80 42v62M108 42v62" stroke="currentColor" stroke-width="2.5" opacity=".35"/>
      <rect x="56" y="48" width="20" height="22" rx="3" fill="currentColor" opacity=".35"/>
      <rect x="84" y="62" width="20" height="30" rx="3" fill="currentColor" class="art-accent" opacity=".9"/>
      <rect x="28" y="72" width="20" height="18" rx="3" fill="currentColor" opacity=".2"/>
    </svg>`,
};

export function renderEmptyState(
  target: HTMLElement,
  options: EmptyStateOptions,
): HTMLElement {
  target.classList.add("empty-state");
  target.classList.toggle("empty-state--compact", options.compact === true);
  target.replaceChildren();

  const art = document.createElement("div");
  art.className = "empty-state__art";
  art.innerHTML = ART[options.illustration];

  const title = document.createElement("p");
  title.className = "empty-state__title";
  title.textContent = options.title;

  target.append(art, title);

  if (options.hint) {
    const hint = document.createElement("p");
    hint.className = "empty-state__hint";
    hint.textContent = options.hint;
    target.appendChild(hint);
  }

  if (options.ctaLabel) {
    const cta = document.createElement("button");
    cta.type = "button";
    cta.className = "btn btn--primary empty-state__cta";
    cta.innerHTML = `<i class="${options.ctaIcon ?? "ti ti-plus"}" aria-hidden="true"></i><span>${options.ctaLabel}</span>`;
    if (options.onCta) cta.addEventListener("click", options.onCta);
    target.appendChild(cta);
  }

  return target;
}

export function toggleEmptyState(element: HTMLElement, hasItems: boolean): void {
  element.hidden = hasItems;
}
