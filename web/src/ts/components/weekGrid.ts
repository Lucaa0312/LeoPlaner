import { DAYS, PERIODS } from "../utils/periods.js";

// Monday to Friday times the periods. Row 1 and column 1 hold the labels,
// so a day index d and a schoolHour h land in column d + 2 and row h + 1.
export function createWeekGrid(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "week-grid";

    const corner = document.createElement("div");
    grid.appendChild(corner);

    for (let i = 0; i < DAYS.length; i++) {
        const head = document.createElement("div");
        head.className = "week-head";
        head.textContent = DAYS[i]!.name;
        placeInGrid(head, i, 0, 1);
        grid.appendChild(head);
    }

    for (const period of PERIODS) {
        const label = document.createElement("div");
        label.className = "week-period";
        label.style.gridColumn = "1";
        label.style.gridRow = String(period.schoolHour + 1);

        const number = document.createElement("span");
        number.className = "week-period-number";
        number.textContent = period.label;

        const time = document.createElement("span");
        time.className = "week-period-time";
        time.textContent = `${period.start}–${period.end}`;

        label.append(number, time);
        grid.appendChild(label);
    }

    return grid;
}

// schoolHour 0 is the header row.
export function placeInGrid(element: HTMLElement, dayIndex: number, schoolHour: number, span: number): void {
    element.style.gridColumn = String(dayIndex + 2);
    element.style.gridRow = `${schoolHour + 1} / span ${span}`;
}

// Empty background cells, so free periods are visible.
export function addEmptyCells(grid: HTMLElement): void {
    for (let d = 0; d < DAYS.length; d++) {
        for (const period of PERIODS) {
            const cell = document.createElement("div");
            cell.className = "week-cell";
            placeInGrid(cell, d, period.schoolHour, 1);
            grid.appendChild(cell);
        }
    }
}
