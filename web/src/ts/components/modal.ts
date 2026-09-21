// Shared modal component.
//
// A modal root is a `.modal` element that lives anywhere in the page:
//
//   <div class="modal" id="add-teacher-screen" role="dialog" aria-modal="true"></div>
//
// `buildModal()` fills it with the standard frame (backdrop, panel, header,
// scrollable body, sticky footer) and hands back the slots to render into.
// `openModal()` / `closeModal()` toggle the `is-open` class, lock the main
// scroll region, trap focus, close on Escape / backdrop click and restore
// focus to whatever opened the modal.

export type ModalSize = "sm" | "md" | "lg";

export type ModalFrame = {
  root: HTMLElement;
  panel: HTMLElement;
  header: HTMLElement;
  heading: HTMLElement;
  aside: HTMLElement;
  body: HTMLElement;
  footer: HTMLElement;
  setTitle(title: string, subtitle?: string): void;
};

type ModalOptions = {
  title: string;
  subtitle?: string;
  size?: ModalSize;
  onClose?: () => void;
};

type OpenState = {
  opener: HTMLElement | null;
  onClose: (() => void) | undefined;
  keyHandler: (event: KeyboardEvent) => void;
};

const openState = new WeakMap<HTMLElement, OpenState>();
const closeCallbacks = new WeakMap<HTMLElement, () => void>();

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

let titleCounter = 0;

export function buildModal(root: HTMLElement, options: ModalOptions): ModalFrame {
  root.classList.add("modal");
  root.classList.remove("modal--sm", "modal--lg");
  if (options.size === "sm") root.classList.add("modal--sm");
  if (options.size === "lg") root.classList.add("modal--lg");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");

  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";
  backdrop.dataset.modalClose = "";

  const panel = document.createElement("div");
  panel.className = "modal__panel";
  panel.tabIndex = -1;

  const header = document.createElement("header");
  header.className = "modal__header";

  const heading = document.createElement("div");
  heading.className = "modal__heading";

  const titleEl = document.createElement("h2");
  titleEl.className = "modal__title";
  titleEl.id = root.id ? `${root.id}-title` : `modal-title-${++titleCounter}`;
  root.setAttribute("aria-labelledby", titleEl.id);

  const subtitleEl = document.createElement("p");
  subtitleEl.className = "modal__subtitle";

  heading.append(titleEl, subtitleEl);

  const aside = document.createElement("div");
  aside.className = "modal__aside";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-btn modal__close";
  close.dataset.modalClose = "";
  close.setAttribute("aria-label", "Schließen");
  close.innerHTML = `<i class="ti ti-x" aria-hidden="true"></i>`;

  header.append(heading, aside, close);

  const body = document.createElement("div");
  body.className = "modal__body";

  const footer = document.createElement("footer");
  footer.className = "modal__footer";

  panel.append(header, body, footer);
  root.replaceChildren(backdrop, panel);

  const setTitle = (title: string, subtitle?: string) => {
    titleEl.textContent = title;
    subtitleEl.textContent = subtitle ?? "";
    subtitleEl.hidden = !subtitle;
  };
  setTitle(options.title, options.subtitle);

  // one delegated close handler per root
  if (!root.dataset.modalBound) {
    root.dataset.modalBound = "true";
    root.addEventListener("click", (event) => {
      const target = event.target as Element | null;
      if (target?.closest("[data-modal-close]")) closeModal(root);
    });
  }

  if (options.onClose) closeCallbacks.set(root, options.onClose);
  else closeCallbacks.delete(root);

  return { root, panel, header, heading, aside, body, footer, setTitle };
}

export function openModal(root: HTMLElement, options?: { onClose?: () => void }): void {
  if (openState.has(root)) return;

  const panel = root.querySelector<HTMLElement>(".modal__panel") ?? root;
  const opener =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  const keyHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal(root);
      return;
    }
    if (event.key !== "Tab") return;

    const items = focusables(panel);
    if (items.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const onClose = options?.onClose ?? closeCallbacks.get(root);

  openState.set(root, { opener, onClose, keyHandler });

  root.classList.add("is-open");
  document.body.classList.add("modal-open");
  document.addEventListener("keydown", keyHandler);

  // Focus the first meaningful control, falling back to the panel itself.
  window.requestAnimationFrame(() => {
    const items = focusables(panel).filter(
      (el) => !el.classList.contains("modal__close"),
    );
    (items[0] ?? panel).focus();
  });
}

export function closeModal(root: HTMLElement): void {
  const state = openState.get(root);
  if (!state) return;

  openState.delete(root);
  document.removeEventListener("keydown", state.keyHandler);
  root.classList.remove("is-open");

  if (!document.querySelector(".modal.is-open")) {
    document.body.classList.remove("modal-open");
  }

  if (state.opener && state.opener.isConnected) {
    state.opener.focus();
  }

  state.onClose?.();
}

export function isModalOpen(root: HTMLElement): boolean {
  return openState.has(root);
}
