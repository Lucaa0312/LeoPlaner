import type { SubjectColor } from "../types/subject.js";

export interface ColorPickerController {
    getSelectedColor(): SubjectColor;
    setColor(color: SubjectColor): void;
}

// Quick-pick swatches shown under the wheel.
const PRESETS: SubjectColor[] = [
    { red: 79, green: 70, blue: 229 },
    { red: 14, green: 165, blue: 233 },
    { red: 16, green: 185, blue: 129 },
    { red: 132, green: 204, blue: 22 },
    { red: 245, green: 158, blue: 11 },
    { red: 239, green: 68, blue: 68 },
    { red: 236, green: 72, blue: 153 },
    { red: 139, green: 92, blue: 246 },
    { red: 100, green: 116, blue: 139 },
];

export function initColorPicker(container: HTMLElement): ColorPickerController {
    container.classList.add("color-picker");
    container.innerHTML = `
      <div class="color-picker__wheel-wrap">
        <canvas id="color-wheel" width="220" height="220" aria-label="Farbrad – klicken oder ziehen, um einen Farbton zu wählen"></canvas>
      </div>

      <div class="color-picker__side" id="color-side">
        <div class="color-picker__preview-row" id="color-preview-row">
          <div class="color-picker__preview" id="color-preview" aria-hidden="true"></div>
          <div class="color-picker__values">
            <div class="color-picker__hex text-mono" id="color-hex">#ded1d6</div>
            <div class="color-picker__rgb" id="color-rgb">RGB(222, 209, 214)</div>
          </div>
        </div>

        <label class="field" id="lightness-label">
          <span class="field__label">Helligkeit</span>
          <input id="lightness" class="range" type="range" min="0" max="100" value="85">
        </label>

        <div class="color-picker__presets" role="group" aria-label="Schnellauswahl">
          ${PRESETS.map(
              (c, i) =>
                  `<button type="button" class="color-picker__preset" data-preset="${i}" style="--swatch: rgb(${c.red}, ${c.green}, ${c.blue})" aria-label="Farbe ${i + 1}"></button>`,
          ).join("")}
        </div>
      </div>
    `;

    const canvas = container.querySelector("#color-wheel") as HTMLCanvasElement | null;
    const lightness = container.querySelector("#lightness") as HTMLInputElement | null;
    const preview = container.querySelector("#color-preview") as HTMLElement | null;
    const hexEl = container.querySelector("#color-hex") as HTMLElement | null;
    const rgbEl = container.querySelector("#color-rgb") as HTMLElement | null;

    if (
        !(canvas instanceof HTMLCanvasElement) ||
        !(lightness instanceof HTMLInputElement) ||
        !(preview instanceof HTMLElement) ||
        !(hexEl instanceof HTMLElement) ||
        !(rgbEl instanceof HTMLElement)
    ) {
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

    let selectedColor: SubjectColor = { red: 222, green: 209, blue: 214 };

    function hslToRgb(h: number, s: number, l: number): SubjectColor {
        h = (h % 360 + 360) % 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let r1 = 0;
        let g1 = 0;
        let b1 = 0;

        if (h < 60) [r1, g1, b1] = [c, x, 0];
        else if (h < 120) [r1, g1, b1] = [x, c, 0];
        else if (h < 180) [r1, g1, b1] = [0, c, x];
        else if (h < 240) [r1, g1, b1] = [0, x, c];
        else if (h < 300) [r1, g1, b1] = [x, 0, c];
        else [r1, g1, b1] = [c, 0, x];

        return {
            red: Math.round((r1 + m) * 255),
            green: Math.round((g1 + m) * 255),
            blue: Math.round((b1 + m) * 255),
        };
    }

    function rgbToHsl({ red, green, blue }: SubjectColor): { h: number; s: number; l: number } {
        const r = red / 255;
        const g = green / 255;
        const b = blue / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const d = max - min;

        if (d === 0) return { h: 0, s: 0, l };

        const s = d / (1 - Math.abs(2 * l - 1));
        let h = 0;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h = (h * 60 + 360) % 360;

        return { h, s: Math.min(1, s), l };
    }

    function rgbToHex({ red, green, blue }: SubjectColor): string {
        const to2 = (n: number) => n.toString(16).padStart(2, "0");
        return `#${to2(red)}${to2(green)}${to2(blue)}`;
    }

    function paintPreview(color: SubjectColor): void {
        const hex = rgbToHex(color);
        preview!.style.background = hex;
        hexEl!.textContent = hex;
        rgbEl!.textContent = `RGB(${color.red}, ${color.green}, ${color.blue})`;
        container.style.setProperty("--picked", hex);
    }

    function drawWheel(): void {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

        const img = ctx!.createImageData(canvas!.width, canvas!.height);

        for (let y = 0; y < canvas!.height; y++) {
            for (let x = 0; x < canvas!.width; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const i = (y * canvas!.width + x) * 4;

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
                // soft anti-aliased edge
                img.data[i + 3] = dist > radius - 1.5 ? Math.round((radius - dist) / 1.5 * 255) : 255;
            }
        }

        ctx!.putImageData(img, 0, 0);

        const ang = hue * Math.PI / 180;
        const markerRadius = sat * radius;
        const mx = cx + Math.cos(ang) * markerRadius;
        const my = cy + Math.sin(ang) * markerRadius;

        ctx!.beginPath();
        ctx!.arc(mx, my, 8, 0, Math.PI * 2);
        ctx!.lineWidth = 3;
        ctx!.strokeStyle = "white";
        ctx!.stroke();
        ctx!.lineWidth = 1.5;
        ctx!.strokeStyle = "rgba(0,0,0,.4)";
        ctx!.stroke();
    }

    function setFromPoint(clientX: number, clientY: number): void {
        const rect = canvas!.getBoundingClientRect();
        // the canvas is scaled by CSS – map client coordinates back to pixels
        const x = (clientX - rect.left) * (canvas!.width / rect.width);
        const y = (clientY - rect.top) * (canvas!.height / rect.height);

        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, radius);

        const angle = Math.atan2(dy, dx);
        hue = (angle * 180 / Math.PI + 360) % 360;
        sat = clamped / radius;

        updateColor();
    }

    function updateColor(): void {
        lig = Number(lightness!.value) / 100;
        selectedColor = hslToRgb(hue, sat, lig);
        paintPreview(selectedColor);
        drawWheel();
    }

    // Sets an exact colour (edit mode / presets) and moves the wheel marker
    // and lightness slider to match.
    function setColor(color: SubjectColor): void {
        selectedColor = color;
        const { h, s, l } = rgbToHsl(color);
        hue = h;
        sat = s;
        lig = l;
        lightness!.value = String(Math.round(l * 100));
        paintPreview(color);
        drawWheel();
    }

    canvas.addEventListener("pointerdown", (event) => {
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
        setFromPoint(event.clientX, event.clientY);
    });

    canvas.addEventListener("pointermove", (event) => {
        if (!dragging) return;
        setFromPoint(event.clientX, event.clientY);
    });

    canvas.addEventListener("pointerup", () => {
        dragging = false;
    });

    canvas.addEventListener("pointercancel", () => {
        dragging = false;
    });

    lightness.addEventListener("input", updateColor);

    container.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
        button.addEventListener("click", () => {
            const preset = PRESETS[Number(button.dataset.preset)];
            if (preset) setColor(preset);
        });
    });

    updateColor();

    return {
        getSelectedColor(): SubjectColor {
            return selectedColor;
        },
        setColor,
    };
}
