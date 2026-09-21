import { getElement } from "../utils/elementHelpers.js";

// Timetable view switcher: a segmented control (Klasse / Lehrer / Raum) plus a
// searchable picker listing the entities of the active kind.

export type ViewKind = "class" | "teacher" | "room";

export type PickerEntity = {
  id: number;
  label: string;
  sub?: string | undefined;
};

type ViewSwitcherOptions = {
  initialKind: ViewKind;
  initialId: string;
  onSelect: (kind: ViewKind, entity: PickerEntity) => void;
};

const API = "http://localhost:8080/api";

type TeacherItem = { id: number; teacherName: string; nameSymbol?: string };
type ClassItem = { id: number; className: string };
type RoomItem = { id: number; roomName: string; nameShort?: string };

const KIND_META: Record<
  ViewKind,
  { placeholder: string; empty: string; icon: string }
> = {
  class: { placeholder: "Klasse suchen …", empty: "Keine Klassen vorhanden", icon: "ti ti-school" },
  teacher: { placeholder: "Lehrkraft suchen …", empty: "Keine Lehrkräfte vorhanden", icon: "ti ti-user" },
  room: { placeholder: "Raum suchen …", empty: "Keine Räume vorhanden", icon: "ti ti-door" },
};

const naturalCompare = (a: string, b: string) =>
  a.localeCompare(b, "de", { numeric: true, sensitivity: "base" });

async function fetchEntities(kind: ViewKind): Promise<PickerEntity[]> {
  switch (kind) {
    case "teacher": {
      const res = await fetch(`${API}/teachers`);
      const data = (await res.json()) as TeacherItem[];
      return data
        .map((t) => ({ id: t.id, label: t.teacherName, sub: t.nameSymbol }))
        .sort((a, b) => naturalCompare(a.label, b.label));
    }
    case "room": {
      const res = await fetch(`${API}/rooms`);
      const data = (await res.json()) as RoomItem[];
      return data
        .map((r) => ({ id: r.id, label: r.roomName, sub: r.nameShort }))
        .sort((a, b) => naturalCompare(a.label, b.label));
    }
    default: {
      const res = await fetch(`${API}/getAllClasses`);
      const data = (await res.json()) as ClassItem[];
      return data
        .map((c) => ({ id: c.id, label: c.className.toUpperCase() }))
        .sort((a, b) => naturalCompare(a.label, b.label));
    }
  }
}

export function initViewSwitcher(options: ViewSwitcherOptions) {
  const switcher = getElement<HTMLElement>("view-switcher");
  const trigger = getElement<HTMLButtonElement>("picker-trigger");
  const label = getElement<HTMLElement>("picker-label");
  const menu = getElement<HTMLElement>("picker-menu");
  const search = getElement<HTMLInputElement>("picker-search");
  const list = getElement<HTMLElement>("picker-list");
  const picker = getElement<HTMLElement>("entity-picker");

  if (!switcher || !trigger || !label || !menu || !search || !list || !picker) {
    return;
  }

  const cache = new Map<ViewKind, PickerEntity[]>();
  let activeKind: ViewKind = options.initialKind;
  let selected: PickerEntity | null = null;
  let entities: PickerEntity[] = [];

  function setActiveButton(kind: ViewKind): void {
    switcher!.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((btn) => {
      const active = btn.dataset.view === kind;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
  }

  function setLabel(entity: PickerEntity | null): void {
    if (!entity) {
      label!.textContent = KIND_META[activeKind].empty;
      return;
    }
    label!.innerHTML = `<i class="${KIND_META[activeKind].icon}" aria-hidden="true"></i> ${entity.label}`;
  }

  function openMenu(): void {
    menu!.hidden = false;
    trigger!.setAttribute("aria-expanded", "true");
    search!.value = "";
    renderList("");
    window.requestAnimationFrame(() => search!.focus());
  }

  function closeMenu(): void {
    if (menu!.hidden) return;
    menu!.hidden = true;
    trigger!.setAttribute("aria-expanded", "false");
  }

  function choose(entity: PickerEntity): void {
    selected = entity;
    setLabel(entity);
    closeMenu();
    trigger!.focus();
    options.onSelect(activeKind, entity);
  }

  function renderList(query: string): void {
    const q = query.trim().toLowerCase();
    list!.replaceChildren();

    const matches = entities.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        (e.sub ?? "").toLowerCase().includes(q),
    );

    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "picker__empty";
      li.textContent = entities.length === 0 ? KIND_META[activeKind].empty : "Keine Treffer";
      list!.appendChild(li);
      return;
    }

    matches.forEach((entity) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(selected?.id === entity.id));

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "picker__item";
      if (selected?.id === entity.id) btn.classList.add("is-selected");
      btn.innerHTML = `
        <span class="picker__item-label">${entity.label}</span>
        ${entity.sub ? `<span class="badge badge--mono">${entity.sub}</span>` : ""}
        <i class="ti ti-check picker__item-check" aria-hidden="true"></i>`;
      btn.addEventListener("click", () => choose(entity));

      li.appendChild(btn);
      list!.appendChild(li);
    });
  }

  async function loadKind(kind: ViewKind, preferredId?: string): Promise<void> {
    activeKind = kind;
    setActiveButton(kind);
    search!.placeholder = KIND_META[kind].placeholder;
    label!.textContent = "Laden …";
    trigger!.disabled = true;

    try {
      if (!cache.has(kind)) cache.set(kind, await fetchEntities(kind));
      entities = cache.get(kind) ?? [];
    } catch (error) {
      console.error(`Error loading ${kind} list for the picker:`, error);
      entities = [];
    } finally {
      trigger!.disabled = false;
    }

    const preferred =
      preferredId !== undefined
        ? entities.find((e) => String(e.id) === preferredId)
        : undefined;
    const next = preferred ?? entities[0] ?? null;

    selected = next;
    setLabel(next);

    if (next) {
      options.onSelect(kind, next);
    } else if (preferredId !== undefined) {
      // nothing listed (backend down?) – still try the requested id so the
      // canvas gets a chance to load
      options.onSelect(kind, { id: Number(preferredId), label: "" });
    }
  }

  // ---- wiring ----------------------------------------------------------
  switcher.addEventListener("click", (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-view]");
    if (!btn) return;
    const kind = btn.dataset.view as ViewKind;
    if (kind === activeKind) return;
    closeMenu();
    void loadKind(kind);
  });

  trigger.addEventListener("click", () => {
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  search.addEventListener("input", () => renderList(search.value));

  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const first = list.querySelector<HTMLButtonElement>(".picker__item");
      first?.click();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      list.querySelector<HTMLButtonElement>(".picker__item")?.focus();
    }
  });

  list.addEventListener("keydown", (event) => {
    const items = Array.from(list.querySelectorAll<HTMLButtonElement>(".picker__item"));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[Math.min(index + 1, items.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) search.focus();
      else items[index - 1]?.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!picker.contains(event.target as Node)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      closeMenu();
      trigger.focus();
    }
  });

  void loadKind(options.initialKind, options.initialId);

  return {
    getActiveKind: () => activeKind,
    getSelected: () => selected,
  };
}
