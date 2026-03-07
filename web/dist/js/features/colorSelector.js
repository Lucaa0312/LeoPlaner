export function initColorPicker(container) {
    container.innerHTML = `
      <h2 id="color-title">Wähle eine Farbe aus</h2>

      <div id="color-ui">
        <canvas id="color-wheel" width="220" height="220"></canvas>

        <div id="color-side">
          <div id="color-preview-row">
            <div id="color-preview"></div>
            <div>
              <div id="color-hex">#ded1d6</div>
              <div id="color-rgb">RGB(222, 209, 214)</div>
            </div>
          </div>

          <label id="lightness-label">
            Helligkeit
            <input id="lightness" type="range" min="0" max="100" value="50">
          </label>
        </div>
      </div>
    `;
    const canvas = container.querySelector("#color-wheel");
    ;
    const lightness = container.querySelector("#lightness");
    const preview = container.querySelector("#color-preview");
    const hexEl = container.querySelector("#color-hex");
    const rgbEl = container.querySelector("#color-rgb");
    if (!(canvas instanceof HTMLCanvasElement) ||
        !(lightness instanceof HTMLInputElement) ||
        !(preview instanceof HTMLElement) ||
        !(hexEl instanceof HTMLElement) ||
        !(rgbEl instanceof HTMLElement)) {
        throw new Error("Color picker elements could not be initialized.");
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
        throw new Error("Canvas context could not be created.");
    }
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(cx, cy) - 6;
    let hue = 300;
    let sat = 0.15;
    let lig = 0.85;
    let dragging = false;
    let selectedColor = { red: 222, green: 209, blue: 214 };
    function hslToRgb(h, s, l) {
        h = (h % 360 + 360) % 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r1 = 0;
        let g1 = 0;
        let b1 = 0;
        if (h < 60)
            [r1, g1, b1] = [c, x, 0];
        else if (h < 120)
            [r1, g1, b1] = [x, c, 0];
        else if (h < 180)
            [r1, g1, b1] = [0, c, x];
        else if (h < 240)
            [r1, g1, b1] = [0, x, c];
        else if (h < 300)
            [r1, g1, b1] = [x, 0, c];
        else
            [r1, g1, b1] = [c, 0, x];
        return {
            red: Math.round((r1 + m) * 255),
            green: Math.round((g1 + m) * 255),
            blue: Math.round((b1 + m) * 255),
        };
    }
    function rgbToHex({ red, green, blue }) {
        const to2 = (n) => n.toString(16).padStart(2, "0");
        return `#${to2(red)}${to2(green)}${to2(blue)}`;
    }
    function drawWheel() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const img = ctx.createImageData(canvas.width, canvas.height);
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const i = (y * canvas.width + x) * 4;
                if (dist > radius) {
                    img.data[i + 3] = 0;
                    continue;
                }
                const angle = Math.atan2(dy, dx);
                const h = (angle * 180 / Math.PI + 360) % 360;
                const s = dist / radius;
                const rgb = hslToRgb(h, s, lig);
                img.data[i] = rgb.red;
                img.data[i + 1] = rgb.green;
                img.data[i + 2] = rgb.blue;
                img.data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        const ang = hue * Math.PI / 180;
        const markerRadius = sat * radius;
        const mx = cx + Math.cos(ang) * markerRadius;
        const my = cy + Math.sin(ang) * markerRadius;
        ctx.beginPath();
        ctx.arc(mx, my, 7, 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "white";
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,.35)";
        ctx.stroke();
    }
    function setFromPoint(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, radius);
        const angle = Math.atan2(dy, dx);
        hue = (angle * 180 / Math.PI + 360) % 360;
        sat = clamped / radius;
        updateColor();
    }
    function updateColor() {
        lig = Number(lightness.value) / 100;
        selectedColor = hslToRgb(hue, sat, lig);
        const hex = rgbToHex(selectedColor);
        preview.style.background = hex;
        hexEl.textContent = hex;
        rgbEl.textContent = `RGB(${selectedColor.red}, ${selectedColor.green}, ${selectedColor.blue})`;
        drawWheel();
    }
    canvas.addEventListener("pointerdown", (event) => {
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
        setFromPoint(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointermove", (event) => {
        if (!dragging)
            return;
        setFromPoint(event.clientX, event.clientY);
    });
    canvas.addEventListener("pointerup", () => {
        dragging = false;
    });
    canvas.addEventListener("pointercancel", () => {
        dragging = false;
    });
    lightness.addEventListener("input", updateColor);
    updateColor();
    return {
        getSelectedColor() {
            return selectedColor;
        },
    };
}
