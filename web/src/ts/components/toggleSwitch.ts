export type ToggleSwitch = {
    element: HTMLButtonElement;
    isOn: () => boolean;
};

// On/off switch with a label, e.g. "Muss als Doppelstunde stattfinden".
export function createToggleSwitch(label: string, initiallyOn: boolean): ToggleSwitch {
    let on = initiallyOn;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "toggle";

    const track = document.createElement("span");
    track.className = "toggle-track";

    const knob = document.createElement("span");
    knob.className = "toggle-knob";
    track.appendChild(knob);

    const text = document.createElement("span");
    text.textContent = label;

    button.append(track, text);
    showState();

    function showState(): void {
        if (on) {
            button.classList.add("on");
        } else {
            button.classList.remove("on");
        }
        button.setAttribute("aria-pressed", String(on));
    }

    function handleToggleClick(): void {
        on = !on;
        showState();
    }

    function isOn(): boolean {
        return on;
    }

    button.addEventListener("click", handleToggleClick);
    return { element: button, isOn };
}
