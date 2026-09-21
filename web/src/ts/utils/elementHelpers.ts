export function getElement<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

export function aquireElement<T extends HTMLElement>(id: string): T {
  const element = getElement<T>(id);

  if (!element) {
    throw new Error(`Element with id "${id}" not found.`);
  }

  return element;
}

export function formatName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

// Keeps mixed-case names as they are ("EDV-Saal 1") and only normalises
// names stored entirely in lower- or upper-case.
export function smartCase(name: string): string {
  const trimmed = name.trim();
  const uniform =
    trimmed === trimmed.toLowerCase() || trimmed === trimmed.toUpperCase();
  if (!uniform) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
