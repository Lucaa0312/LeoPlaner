import type { TimeSlot } from "../types/teacher.js";

type AvailabilityConfig = {
  container: HTMLElement;
  times: string[];
};

type Period = { start: string; end: string; label: string };

export function initSetAvailability({ container, times }: AvailabilityConfig) {
  let nonWorking: TimeSlot[] = [];
  let nonPreferred: TimeSlot[] = [];
  const days = ["Mo", "Di", "Mi", "Do", "Fr"];

  // Pair consecutive times into periods: [0,1], [2,3], ...
  const periods: Period[] = [];
  for (let i = 0; i + 1 < times.length; i += 2) {
    const start = times[i];
    const end = times[i + 1];

    if (start && end) {
      periods.push({
        start,
        end,
        label: `${i / 2}. EH`,
      });
    }
  }

  function getState(
    dayIndex: number,
    time: string,
  ): "none" | "non-preferred" | "non-working" {
    if (nonWorking.some((t) => t.day === dayIndex && t.time === time))
      return "non-working";
    if (nonPreferred.some((t) => t.day === dayIndex && t.time === time))
      return "non-preferred";
    return "none";
  }

  function toggleSlot(dayIndex: number, time: string, element: HTMLElement) {
    const state = getState(dayIndex, time);

    // Remove from both arrays first
    nonWorking = nonWorking.filter(
      (t) => !(t.day === dayIndex && t.time === time),
    );
    nonPreferred = nonPreferred.filter(
      (t) => !(t.day === dayIndex && t.time === time),
    );
    element.classList.remove("non-preferred", "non-working");
    element.textContent = "";

    if (state === "none") {
      nonPreferred.push({ day: dayIndex, time });
      element.classList.add("non-preferred");
      element.textContent = "Nicht bevorzugt";
    } else if (state === "non-preferred") {
      nonWorking.push({ day: dayIndex, time });
      element.classList.add("non-working");
      element.textContent = "Nicht verfügbar";
    }
    // state === "non-working" → stays empty (reset)
  }

  function renderGrid() {
    container.innerHTML = "";

    // ── Header row ──────────────────────────────────────────
    const headerRow = document.createElement("div");
    headerRow.className = "ag-row ag-header-row";

    const corner = document.createElement("div");
    corner.className = "ag-time-label";
    headerRow.appendChild(corner);

    days.forEach((day) => {
      const th = document.createElement("div");
      th.className = "ag-day-header";
      th.textContent = day;
      headerRow.appendChild(th);
    });

    container.appendChild(headerRow);

    // ── Period rows ──────────────────────────────────────────
    periods.forEach((period) => {
      const row = document.createElement("div");
      row.className = "ag-row ag-period-row";

      const label = document.createElement("div");
      label.className = "ag-time-label";
      label.innerHTML = `
                <span class="ag-time-start">${period.start}</span>
                <span class="ag-period-name">${period.label}</span>
                <span class="ag-time-end">${period.end}</span>
            `;
      row.appendChild(label);

      days.forEach((_, dayIndex) => {
        const cell = document.createElement("div");
        cell.className = "ag-cell";
        cell.addEventListener("click", () =>
          toggleSlot(dayIndex, period.start, cell),
        );
        row.appendChild(cell);
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
