// Toast notifications.
//
//   toast.success("Lehrer gespeichert");
//   toast.error("Speichern fehlgeschlagen");
//
// All toasts render into one polite live region so screen readers announce
// them without interrupting. At most MAX_VISIBLE are shown; older ones are
// dropped first. Each toast auto-dismisses after AUTO_DISMISS_MS and can be
// closed by hand.

type ToastKind = "success" | "error" | "info";

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;
const LEAVE_MS = 220;

const ICONS: Record<ToastKind, string> = {
  success: "ti ti-circle-check",
  error: "ti ti-alert-circle",
  info: "ti ti-info-circle",
};

let region: HTMLElement | null = null;

function getRegion(): HTMLElement {
  if (region && region.isConnected) return region;

  region = document.createElement("div");
  region.className = "toast-region";
  region.setAttribute("aria-live", "polite");
  region.setAttribute("aria-atomic", "false");
  region.setAttribute("role", "status");
  document.body.appendChild(region);
  return region;
}

function dismiss(el: HTMLElement): void {
  if (el.classList.contains("is-leaving")) return;
  el.classList.add("is-leaving");
  window.setTimeout(() => el.remove(), LEAVE_MS);
}

function show(kind: ToastKind, message: string): HTMLElement {
  const host = getRegion();

  // identical message already on screen → just nudge it instead of stacking
  const existing = Array.from(host.children).find(
    (el) =>
      el.classList.contains(`toast--${kind}`) &&
      !el.classList.contains("is-leaving") &&
      el.querySelector(".toast__message")?.textContent === message,
  ) as HTMLElement | undefined;
  if (existing) {
    existing.classList.remove("is-nudge");
    void existing.offsetWidth; // restart the animation
    existing.classList.add("is-nudge");
    return existing;
  }

  // enforce the stack limit – oldest first
  const visible = Array.from(host.children) as HTMLElement[];
  while (visible.length >= MAX_VISIBLE) {
    const oldest = visible.shift();
    if (oldest) oldest.remove();
  }

  const el = document.createElement("div");
  el.className = `toast toast--${kind}`;

  const icon = document.createElement("i");
  icon.className = `toast__icon ${ICONS[kind]}`;
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("div");
  text.className = "toast__message";
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "icon-btn icon-btn--sm toast__close";
  close.setAttribute("aria-label", "Meldung schließen");
  close.innerHTML = `<i class="ti ti-x" aria-hidden="true"></i>`;

  let timer = window.setTimeout(() => dismiss(el), AUTO_DISMISS_MS);

  close.addEventListener("click", () => {
    window.clearTimeout(timer);
    dismiss(el);
  });

  // pause the timer while hovered so the message can be read
  el.addEventListener("mouseenter", () => window.clearTimeout(timer));
  el.addEventListener("mouseleave", () => {
    timer = window.setTimeout(() => dismiss(el), AUTO_DISMISS_MS);
  });

  el.append(icon, text, close);
  host.appendChild(el);
  return el;
}

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
  info: (message: string) => show("info", message),
};
