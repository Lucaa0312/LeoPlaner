// "Die Woche sortiert sich": a small demo week for the start page. The lessons start
// on random slots and settle into a clash-free plan while the cost falls, which is what the
// optimisation does with the real school. Example data only; it never touches the backend.
//
// Light enough for computers without graphics acceleration: it plays once (and on "Neu mischen"),
// moves 22 small tiles with transform only, and leaves no animation attached when it is done.
import { DAY_SHORT } from "./store.js";
import { num } from "./ui.js";

type Lesson = { s: string; t: string; d: number; h: number; len: number; c: [number, number, number] };

const C = {
  AM: [20, 112, 250], D: [214, 52, 90], E: [240, 110, 40], POS: [0, 168, 150], NVS: [150, 80, 220],
  GGP: [180, 120, 60], DBI: [242, 170, 0], SYP: [0, 150, 210], WMC: [46, 160, 67], BSP: [120, 126, 140],
} satisfies Record<string, [number, number, number]>;
const T: Record<keyof typeof C, string> = { AM: "KOR", D: "LEH", E: "WAG", POS: "STU", NVS: "BAU", GGP: "HOL", DBI: "AIC", SYP: "PRI", WMC: "ZEN", BSP: "MAY" };
const L = (s: keyof typeof C, d: number, h: number, len = 1): Lesson => ({ s, t: T[s], d, h, len, c: C[s] });

// the finished week (day 0-4, hour 1-6)
const WEEK: Lesson[] = [
  L("AM", 0, 1), L("D", 0, 2), L("POS", 0, 3, 2), L("E", 0, 5),
  L("E", 1, 1), L("NVS", 1, 2, 2), L("AM", 1, 4), L("GGP", 1, 5),
  L("DBI", 2, 1, 2), L("D", 2, 3), L("SYP", 2, 4), L("WMC", 2, 5, 2),
  L("POS", 3, 1, 2), L("AM", 3, 3), L("E", 3, 4), L("D", 3, 5),
  L("SYP", 4, 1), L("NVS", 4, 2), L("DBI", 4, 3), L("BSP", 4, 4, 2),
];
const HOURS = 6;
const START_COST = 4870, END_COST = 212;
const MOVE_MS = 760, SPREAD_MS = 1900;

export type Demo = { play: () => void };

/** Renders the demo week into `host` and returns play(), which (re)starts the sorting. */
export function mountDemo(host: HTMLElement, opts: { label?: string } = {}): Demo {
  host.classList.add("demo");
  host.innerHTML = `
    <div class="demo-grid" role="img" aria-label="${opts.label ?? "Beispielwoche: Stunden ordnen sich zu einem Stundenplan ohne Konflikte"}">
      ${DAY_SHORT.slice(0, 5).map((d, i) => `<span class="dh" style="grid-column:${i + 2}">${d}</span>`).join("")}
      ${Array.from({ length: HOURS }, (_, i) => `<span class="hh" style="grid-row:${i + 2}">${i + 1}</span>`).join("")}
      ${Array.from({ length: HOURS }, (_, i) => `<i class="gl" style="grid-row:${i + 2}"></i>`).join("")}
      ${WEEK.map((l) => `<span class="dt" style="grid-column:${l.d + 2};grid-row:${l.h + 1} / span ${l.len};--c:rgb(${l.c.join(",")})"><b>${l.s}</b><em>${l.t}</em></span>`).join("")}
    </div>
    <div class="demo-cost">
      <div class="dc-n"><span class="dc-l">Kosten</span><b class="num" data-cost>${num(END_COST)}</b></div>
      <svg class="dc-line" viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true"><path data-line d="" /></svg>
    </div>`;

  const grid = host.querySelector<HTMLElement>(".demo-grid")!;
  const tiles = [...grid.querySelectorAll<HTMLElement>(".dt")];
  const costEl = host.querySelector<HTMLElement>("[data-cost]")!;
  const line = host.querySelector<SVGPathElement>("[data-line]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let running: Animation[] = [];
  let raf = 0;

  // an annealing-like curve: falls fast, wobbles while it is hot, flattens out
  const curve = (): number[] => {
    const pts: number[] = [];
    let wob = 0;
    for (let i = 0; i <= 60; i++) {
      const p = i / 60;
      wob = wob * 0.55 + (Math.random() - 0.35) * (1 - p) * 0.22;
      pts.push(Math.max(0, Math.min(1, Math.exp(-4.2 * p) * (1 - p * 0.15) + wob * (1 - p))));
    }
      return pts;
  };
  const flip = (v: number): number => 44 - v * 40;
  // the line grows with the run: only the points up to `upto` are drawn
  const draw = (pts: number[], upto = pts.length - 1): void => {
    line.setAttribute("d", pts.slice(0, upto + 1).map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * 300).toFixed(1)} ${flip(v).toFixed(1)}`).join(" "));
  };

  const play = (): void => {
    for (const a of running) a.cancel();
    cancelAnimationFrame(raf);
    const pts = curve();
    draw(pts, reduced ? pts.length - 1 : 0);
    if (reduced) { host.dataset.state = "done"; costEl.textContent = num(END_COST); return; }
    host.dataset.state = "running";

    const box = grid.getBoundingClientRect();
    const colW = (box.width - 30) / 5, rowH = (box.height - 26) / HOURS;
    const order = tiles.map((_, i) => i).sort(() => Math.random() - 0.5);
    running = tiles.map((tile, i) => {
      const l = WEEK[i]!;
      const d = Math.floor(Math.random() * 5), h = 1 + Math.floor(Math.random() * (HOURS - l.len + 1));
      const dx = (d - l.d) * colW, dy = (h - l.h) * rowH, rot = (Math.random() - 0.5) * 14;
      const delay = (order.indexOf(i) / tiles.length) * SPREAD_MS;
      // fill "backwards" holds the start while it waits and detaches once the tile has landed
      return tile.animate(
        [{ transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)` }, { transform: "none" }],
        { duration: MOVE_MS, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" },
      );
    });

    const t0 = performance.now(), total = SPREAD_MS + MOVE_MS;
    let shown = -1;
    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / total);
      const i = Math.round(p * (pts.length - 1)), v = pts[i]!;
      draw(pts, i);
      const c = Math.round(END_COST + (START_COST - END_COST) * v);
      if (c !== shown) { costEl.textContent = num(c); shown = c; }
      if (p < 1) raf = requestAnimationFrame(tick);
      else host.dataset.state = "done";
    };
    raf = requestAnimationFrame(tick);
  };

  return { play };
}
