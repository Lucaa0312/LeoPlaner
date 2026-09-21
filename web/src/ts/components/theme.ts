// Theme handling: light / dark / system.
//
// The stored choice is applied to <html data-theme> before first paint by the
// small inline script in every page <head> (see web/pages/*.html). This module
// owns the runtime side: reading/writing the choice, cycling it from the
// sidebar toggle and telling interested code (e.g. the ECharts cost chart)
// when the *resolved* theme changes.

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "leo.theme";
export const THEME_CHANGE_EVENT = "leo:themechange";

const ORDER: ThemeChoice[] = ["light", "dark", "system"];

const mediaQuery: MediaQueryList | null =
  typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

function safeRead(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable (private mode etc.) – theme still applies for this page */
  }
}

export function getThemeChoice(): ThemeChoice {
  const stored = safeRead();
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function getResolvedTheme(): ResolvedTheme {
  const choice = getThemeChoice();
  if (choice !== "system") return choice;
  return mediaQuery?.matches ? "dark" : "light";
}

function apply(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = choice;
  }
  document.dispatchEvent(
    new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { choice, resolved: getResolvedTheme() },
    }),
  );
}

export function setTheme(choice: ThemeChoice): void {
  safeWrite(choice === "system" ? null : choice);
  apply(choice);
}

export function cycleTheme(): ThemeChoice {
  const current = getThemeChoice();
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";
  setTheme(next);
  return next;
}

export function themeLabel(choice: ThemeChoice): string {
  switch (choice) {
    case "light":
      return "Hell";
    case "dark":
      return "Dunkel";
    default:
      return "System";
  }
}

export function themeIcon(choice: ThemeChoice): string {
  switch (choice) {
    case "light":
      return "ti ti-sun";
    case "dark":
      return "ti ti-moon";
    default:
      return "ti ti-device-desktop";
  }
}

// Re-broadcast when the OS preference flips while in "system" mode so charts
// and other imperative consumers can re-theme themselves.
mediaQuery?.addEventListener("change", () => {
  if (getThemeChoice() === "system") apply("system");
});
