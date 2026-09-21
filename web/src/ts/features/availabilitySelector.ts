import type { TimeSlot } from "../types/teacher.js";

type Period = { start: string; end: string; label: string };

type AvailabilityConfig = {
  container: HTMLElement;
  periods: Period[];
};

type SlotState = "none" | "non-preferred" | "non-working";

const STATE_LABEL: Record<SlotState, string> = {
  none: "Verfügbar",
  "non-preferred": "Nicht bevorzugt",
  "non-working": "Nicht verfügbar",
};

export function initSetAvailability({
  container,
  periods,
}: AvailabilityConfig) {
  let nonWorking: TimeSlot[] = [];
  let nonPreferred: TimeSlot[] = [];
  const days = ["Mo", "Di", "Mi", "Do", "Fr"];

  const DAY_ENUM = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ] as const;

  function paint(element: HTMLElement, state: SlotState, day: string, label: string) {
    element.classList.remove("non-preferred", "non-working");
    element.dataset.state = state;
    element.textContent = state === "none" ? "" : STATE_LABEL[state];
    element.setAttribute(
      "aria-label",
      `${day}, ${label}: ${STATE_LABEL[state]}. Klicken zum Ändern.`,
    );
    if (state !== "none") element.classList.add(state);
  }

  function toggleSlot(
    dayIndex: number,
    periodIndex: number,
    element: HTMLElement,
  ) {
    const day = DAY_ENUM[dayIndex]!;
    const schoolHour = periodIndex + 1;

    const state = getState(day, schoolHour);

    nonWorking = nonWorking.filter(
      (t) => !(t.day === day && t.schoolHour === schoolHour),
    );
    nonPreferred = nonPreferred.filter(
      (t) => !(t.day === day && t.schoolHour === schoolHour),
    );

    // cycle: available → not preferred → not available → available
    let next: SlotState = "none";
    if (state === "none") {
      nonPreferred.push({ day, schoolHour });
      next = "non-preferred";
    } else if (state === "non-preferred") {
      nonWorking.push({ day, schoolHour });
      next = "non-working";
    }

    paint(element, next, days[dayIndex]!, periods[periodIndex]!.label);
  }

  function getState(day: string, schoolHour: number): SlotState {
    if (nonWorking.some((t) => t.day === day && t.schoolHour === schoolHour))
      return "non-working";
    if (nonPreferred.some((t) => t.day === day && t.schoolHour === schoolHour))
      return "non-preferred";
    return "none";
  }

  function renderLegend(): HTMLElement {
    const legend = document.createElement("div");
    legend.className = "availability-legend";
    legend.innerHTML = `
      <span class="availability-legend__item"><span class="availability-legend__swatch" data-state="none"></span>Verfügbar</span>
      <span class="availability-legend__item"><span class="availability-legend__swatch" data-state="non-preferred"></span>Nicht bevorzugt</span>
      <span class="availability-legend__item"><span class="availability-legend__swatch" data-state="non-working"></span>Nicht verfügbar</span>
      <span class="availability-legend__hint">Klicken wechselt den Zustand</span>`;
    return legend;
  }

  function renderGrid() {
    container.innerHTML = "";
    container.appendChild(renderLegend());

    const grid = document.createElement("div");
    grid.className = "availability-grid";
    grid.setAttribute("role", "grid");

    const headerRow = document.createElement("div");
    headerRow.className = "grid-row header-row";

    const corner = document.createElement("div");
    corner.className = "time-label";
    headerRow.appendChild(corner);

    days.forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "day-header";
      dayHeader.textContent = day;
      headerRow.appendChild(dayHeader);
    });

    grid.appendChild(headerRow);

    periods.forEach((period, periodIndex) => {
      const row = document.createElement("div");
      row.className = "grid-row";

      const label = document.createElement("div");
      label.className = "time-label";
      label.innerHTML = `
                <span class="period-name">${period.label}</span>
                <span class="time-start">${period.start}</span>
                <span class="time-end">${period.end}</span>
            `;
      row.appendChild(label);

      days.forEach((day, dayIndex) => {
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "time-slot";
        paint(slot, "none", day, period.label);
        slot.addEventListener("click", () =>
          toggleSlot(dayIndex, periodIndex, slot),
        );
        row.appendChild(slot);
      });

      grid.appendChild(row);
    });

    container.appendChild(grid);
  }

  renderGrid();

  function restore(
    initialNonWorking: TimeSlot[],
    initialNonPreferred: TimeSlot[],
  ) {
    nonWorking = [...initialNonWorking];
    nonPreferred = [...initialNonPreferred];

    const rows = container.querySelectorAll<HTMLElement>(
      ".grid-row:not(.header-row)",
    );
    rows.forEach((row, periodIndex) => {
      const slots = row.querySelectorAll<HTMLElement>(".time-slot");
      slots.forEach((slot, dayIndex) => {
        const day = DAY_ENUM[dayIndex]!;
        const schoolHour = periodIndex + 1;
        paint(
          slot,
          getState(day, schoolHour),
          days[dayIndex]!,
          periods[periodIndex]!.label,
        );
      });
    });
  }

  return {
    getNonWorking: () => nonWorking,
    getNonPreferred: () => nonPreferred,
    restore,
  };
}
