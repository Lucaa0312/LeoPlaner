import type { TimeSlot } from "../types/teacher.js";
type AvailabilityConfig = {
    container: HTMLElement;
    times: string[];
};

export function initSetAvailability({ container, times }: AvailabilityConfig) {
    let nonWorking: TimeSlot[] = [];
    let nonPreferred: TimeSlot[] = [];

    const days = ["Mo", "Di", "Mi", "Do", "Fr"];

    function toggleSlot(dayIndex: number, time: string, element: HTMLElement) {
        const existingNW = nonWorking.find(t => t.day === dayIndex && t.time === time);
        const existingNP = nonPreferred.find(t => t.day === dayIndex && t.time === time);

        if (!existingNW && !existingNP) {
            nonPreferred.push({ day: dayIndex, time });
            element.classList.add("non-preferred");

        } else if (existingNP) {
            nonPreferred = nonPreferred.filter(t => !(t.day === dayIndex && t.time === time));
            nonWorking.push({ day: dayIndex, time });

            element.classList.remove("non-preferred");
            element.classList.add("non-working");

        } else {
            nonWorking = nonWorking.filter(t => !(t.day === dayIndex && t.time === time));

            element.classList.remove("non-working");
        }
    }

    function renderGrid() {
        container.innerHTML = "";

        days.forEach((day, dayIndex) => {
            const column = document.createElement("div");
            column.className = "day-column";

            const header = document.createElement("div");
            header.textContent = day;
            column.appendChild(header);

            times.forEach(time => {
                const slot = document.createElement("div");
                slot.className = "time-slot";
                slot.textContent = time;

                slot.addEventListener("click", () => {
                    toggleSlot(dayIndex, time, slot);
                });

                column.appendChild(slot);
            });

            container.appendChild(column);
        });
    }

    renderGrid();

    return {
        getNonWorking: () => nonWorking,
        getNonPreferred: () => nonPreferred
    };
}