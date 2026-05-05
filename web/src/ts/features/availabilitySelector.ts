import type { TimeSlot } from "../types/teacher.js";

type Period = { start: string; end: string; label: string };

type AvailabilityConfig = {
  container: HTMLElement;
  periods: Period[];
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
    element.classList.remove("non-preferred", "non-working");
    element.textContent = "";

    if (state === "none") {
      nonPreferred.push({ day, schoolHour });
      element.classList.add("non-preferred");
      element.textContent = "Nicht bevorzugt";
    } else if (state === "non-preferred") {
      nonWorking.push({ day, schoolHour });
      element.classList.add("non-working");
      element.textContent = "Nicht verfügbar";
    }
  }

  function getState(
    day: string,
    schoolHour: number,
  ): "none" | "non-preferred" | "non-working" {
    if (nonWorking.some((t) => t.day === day && t.schoolHour === schoolHour))
      return "non-working";
    if (nonPreferred.some((t) => t.day === day && t.schoolHour === schoolHour))
      return "non-preferred";
    return "none";
  }

  function renderGrid() {
    container.innerHTML = "";

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

    container.appendChild(headerRow);

    periods.forEach((period, periodIndex) => {
      const row = document.createElement("div");
      row.className = "grid-row";

      const label = document.createElement("div");
      label.className = "time-label";
      label.innerHTML = `
                <span class="time-start">${period.start}</span>
                <span class="period-name">${period.label}</span>
                <span class="time-end">${period.end}</span>
            `;
      row.appendChild(label);

      days.forEach((_, dayIndex) => {
        const slot = document.createElement("div");
        slot.className = "time-slot";
        slot.addEventListener("click", () =>
          toggleSlot(dayIndex, periodIndex, slot),
        );
        row.appendChild(slot);
      });

      container.appendChild(row);
    });
  }

  renderGrid();

  return {
    getNonWorking: () => nonWorking,
    getNonPreferred: () => nonPreferred,
  };
}
