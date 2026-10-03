// Vertical thermometer for the temperature of the algorithm. The scale is logarithmic from
// 0,1 to 10 000, so every power of ten has the same length: a run cools down from 100 to about
// 0,1, and that range would be a few pixels on a linear scale.
const LOG_MIN = -1; // 0,1
const LOG_MAX = 4; // 10 000
const SCALE_LABELS = [0.1, 1, 10, 100, 1000, 10000];
// arrow keys move a tenth of a power of ten, Page Up / Down a whole one
const SMALL_STEP = 0.1 / (LOG_MAX - LOG_MIN);
const BIG_STEP = 1 / (LOG_MAX - LOG_MIN);
function clamp(value, min, max) {
    if (value < min) {
        return min;
    }
    else if (value > max) {
        return max;
    }
    return value;
}
// 0 at the bottom of the tube, 1 at the top.
function toPosition(temperature) {
    if (temperature <= 0) {
        return 0;
    }
    return clamp((Math.log10(temperature) - LOG_MIN) / (LOG_MAX - LOG_MIN), 0, 1);
}
// Rounded to three significant digits, so the numbers sent and shown stay short.
function toTemperature(position) {
    const exponent = LOG_MIN + clamp(position, 0, 1) * (LOG_MAX - LOG_MIN);
    return Number(Math.pow(10, exponent).toPrecision(3));
}
export function formatTemperature(temperature) {
    return temperature.toLocaleString("de-AT", { maximumSignificantDigits: 3 });
}
export function createTemperatureGauge(startTemperature, onChange) {
    const gauge = document.createElement("div");
    gauge.className = "gauge";
    gauge.tabIndex = 0;
    gauge.setAttribute("role", "slider");
    gauge.setAttribute("aria-label", "Temperatur");
    gauge.setAttribute("aria-orientation", "vertical");
    gauge.setAttribute("aria-valuemin", "0.1");
    gauge.setAttribute("aria-valuemax", "10000");
    const valueText = document.createElement("span");
    valueText.className = "gauge-value mono";
    const body = document.createElement("div");
    body.className = "gauge-body";
    const scale = document.createElement("div");
    scale.className = "gauge-scale";
    for (const labelValue of SCALE_LABELS) {
        const label = document.createElement("span");
        label.className = "gauge-label mono";
        label.style.bottom = `${toPosition(labelValue) * 100}%`;
        label.textContent = formatTemperature(labelValue);
        scale.appendChild(label);
    }
    const thermometer = document.createElement("div");
    thermometer.className = "gauge-thermometer";
    // The tube carries the whole color gradient, "empty" covers the part above the value.
    const tube = document.createElement("div");
    tube.className = "gauge-tube";
    const empty = document.createElement("div");
    empty.className = "gauge-empty";
    const handle = document.createElement("div");
    handle.className = "gauge-handle";
    tube.append(empty, handle);
    const bulb = document.createElement("div");
    bulb.className = "gauge-bulb";
    thermometer.append(tube, bulb);
    body.append(scale, thermometer);
    gauge.append(valueText, body);
    let temperature = startTemperature;
    let dragging = false;
    function show() {
        const position = toPosition(temperature);
        empty.style.height = `${(1 - position) * 100}%`;
        handle.style.bottom = `${position * 100}%`;
        const text = formatTemperature(temperature);
        valueText.textContent = text;
        gauge.setAttribute("aria-valuenow", String(temperature));
        gauge.setAttribute("aria-valuetext", text);
    }
    function changeTo(position) {
        const newTemperature = toTemperature(position);
        if (newTemperature === temperature) {
            return;
        }
        temperature = newTemperature;
        show();
        onChange(temperature);
    }
    function positionFromPointer(clientY) {
        const rect = tube.getBoundingClientRect();
        return (rect.bottom - clientY) / rect.height;
    }
    function handlePointerDown(event) {
        event.preventDefault();
        dragging = true;
        thermometer.setPointerCapture(event.pointerId);
        gauge.focus();
        changeTo(positionFromPointer(event.clientY));
    }
    function handlePointerMove(event) {
        if (dragging) {
            changeTo(positionFromPointer(event.clientY));
        }
    }
    function handlePointerUp(event) {
        dragging = false;
        if (thermometer.hasPointerCapture(event.pointerId)) {
            thermometer.releasePointerCapture(event.pointerId);
        }
    }
    function handleKeyDown(event) {
        const position = toPosition(temperature);
        if (event.key === "ArrowUp" || event.key === "ArrowRight") {
            changeTo(position + SMALL_STEP);
        }
        else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
            changeTo(position - SMALL_STEP);
        }
        else if (event.key === "PageUp") {
            changeTo(position + BIG_STEP);
        }
        else if (event.key === "PageDown") {
            changeTo(position - BIG_STEP);
        }
        else if (event.key === "Home") {
            changeTo(0);
        }
        else if (event.key === "End") {
            changeTo(1);
        }
        else {
            return;
        }
        event.preventDefault();
    }
    function setTemperature(newTemperature) {
        if (dragging) {
            return;
        }
        temperature = newTemperature;
        show();
    }
    thermometer.addEventListener("pointerdown", handlePointerDown);
    thermometer.addEventListener("pointermove", handlePointerMove);
    thermometer.addEventListener("pointerup", handlePointerUp);
    thermometer.addEventListener("pointercancel", handlePointerUp);
    gauge.addEventListener("keydown", handleKeyDown);
    show();
    return { element: gauge, setTemperature };
}
