// Canvas cost chart for the Optimierung page.
// The page decides where the phases start ("Feinschliff" is only the last cool-down, after the last
// reheat). Reheats are marked "Aufgewärmt", and a dashed line shows the best cost so far.
// Points are folded into fine buckets on the log-x axis as they arrive, so a frame only draws a few
// thousand segments however long the run gets. Axes and the live point glide instead of jumping.
import { num, short } from "./ui.js";
const BUCKETS_PER_DECADE = 500;
const PAD = { l: 58, r: 18, t: 30, b: 30 };
const COLORS = {
    line: "#0b7a84", area: "rgba(11,122,132,.07)", grid: "rgba(24,28,40,.08)", tick: "#5a5f6e", axis: "#4a4f5e",
    ink: "#171a24", peak: "#d6345a", peakInk: "#a8213f", cross: "#4a4f5e", best: "#14935a", bestInk: "#0f7448", heat: "#b77600",
    bands: ["rgba(214,52,90,.06)", "rgba(183,118,0,.06)", "rgba(11,122,132,.07)"], bandInk: "#4a4f5e", bandCur: "#08626a",
};
const LABELS = ["Erkunden", "Verbessern", "Feinschliff"];
const lg = (x) => Math.log10(Math.max(1, x));
/** a reheat: the temperature at least triples between two points and ends up warm */
export const isReheat = (prevT, t) => t > prevT * 3 && t > 0.5;
export class CostChart {
    host;
    canvas;
    tip;
    describe;
    ctx;
    pts = [];
    buckets = [];
    peakPt = null;
    phaseX = [undefined, undefined];
    curPhase = 0;
    /** where the plan was warmed up again */
    reheats = [];
    /** the best cost so far, as steps */
    best = [];
    zoom = "all";
    running = false;
    view = null;
    dot = null;
    hoverX = null;
    raf = 0;
    lastFrame = 0;
    w = 0;
    h = 0;
    dpr = 1;
    reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    constructor(host, canvas, tip, describe) {
        this.host = host;
        this.canvas = canvas;
        this.tip = tip;
        this.describe = describe;
        this.ctx = canvas.getContext("2d");
        new ResizeObserver(() => this.resize()).observe(host);
        host.addEventListener("pointermove", (e) => { this.hoverX = e.clientX - host.getBoundingClientRect().left; this.kick(); });
        host.addEventListener("pointerleave", () => { this.hoverX = null; this.tip.style.opacity = "0"; this.kick(); });
        this.resize();
    }
    // ---------- data ----------
    reset() {
        this.pts = [];
        this.buckets = [];
        this.peakPt = null;
        this.view = null;
        this.dot = null;
        this.reheats = [];
        this.best = [];
        this.phaseX = [undefined, undefined];
        this.kick();
    }
    /** a new point, or the last point updated in place (same x) */
    add(p) {
        const prev = this.pts[this.pts.length - 1];
        if (prev && p.x <= prev.x) {
            prev.c = p.c;
            prev.t = p.t;
        }
        else {
            if (prev && isReheat(prev.t, p.t))
                this.reheats.push(p.x);
            this.pts.push(p);
        }
        const b0 = this.best[this.best.length - 1];
        if (!b0 || p.c < b0.c)
            this.best.push({ x: p.x, c: p.c });
        const k = Math.floor(lg(p.x) * BUCKETS_PER_DECADE);
        const b = this.buckets[this.buckets.length - 1];
        if (b && b.k === k) {
            b.x1 = p.x;
            b.cLast = p.c;
            b.min = Math.min(b.min, p.c);
            b.max = Math.max(b.max, p.c);
        }
        else
            this.buckets.push({ k, x0: p.x, x1: p.x, cFirst: p.c, cLast: p.c, min: p.c, max: p.c });
        if (!this.peakPt || p.c > this.peakPt.c)
            this.peakPt = p;
        this.kick();
    }
    /** where "Verbessern" and "Feinschliff" start (undefined: not yet), and which phase is current */
    setPhases(improveX, polishX, current) {
        if (this.phaseX[0] === improveX && this.phaseX[1] === polishX && this.curPhase === current)
            return;
        this.phaseX = [improveX, polishX];
        this.curPhase = current;
        this.kick();
    }
    setZoom(z) { this.zoom = z; this.kick(); }
    setRunning(r) { this.running = r; this.kick(); }
    get size() { return this.pts.length; }
    // ---------- layout ----------
    resize() {
        const r = this.host.getBoundingClientRect();
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.w = Math.max(1, r.width);
        this.h = Math.max(1, r.height);
        this.canvas.width = Math.round(this.w * this.dpr);
        this.canvas.height = Math.round(this.h * this.dpr);
        this.canvas.style.width = `${this.w}px`;
        this.canvas.style.height = `${this.h}px`;
        this.paint(true);
    }
    target() {
        const last = this.pts[this.pts.length - 1];
        if (!last || this.pts.length < 2)
            return null;
        const end = lg(last.x);
        let x0 = 0, x1 = Math.max(6, end + 0.35);
        if (this.zoom === "end") {
            const polish = this.phaseX[1] ?? this.reheats[this.reheats.length - 1];
            x0 = Math.min(polish !== undefined ? lg(polish) : end - 0.6, end - 0.15);
            x1 = end + Math.max(0.06, (end - x0) * 0.1);
        }
        let lo = Infinity, hi = -Infinity;
        const k0 = Math.floor(x0 * BUCKETS_PER_DECADE);
        for (let i = this.buckets.length - 1; i >= 0; i--) {
            const b = this.buckets[i];
            if (b.k < k0)
                break;
            if (b.min < lo)
                lo = b.min;
            if (b.max > hi)
                hi = b.max;
        }
        if (!isFinite(lo))
            return null;
        if (this.zoom === "all")
            return { x0, x1, y0: 0, y1: hi * 1.06 };
        const pad = Math.max(10, (hi - lo) * 0.15);
        return { x0, x1, y0: Math.max(0, lo - pad), y1: hi + pad };
    }
    // ---------- frame loop: runs only while something moves ----------
    kick() { if (!this.raf)
        this.raf = requestAnimationFrame((t) => this.frame(t)); }
    frame(now) {
        this.raf = 0;
        // at most ~60 frames/s: on 120-175 Hz screens without graphics acceleration every frame is CPU work
        if (this.lastFrame && now - this.lastFrame < 15) {
            this.kick();
            return;
        }
        const dt = this.lastFrame ? Math.min(64, now - this.lastFrame) : 16;
        this.lastFrame = now;
        const moving = this.paint(false, dt, now);
        if (moving || this.running || this.hoverX !== null)
            this.kick();
        else
            this.lastFrame = 0;
    }
    /** returns true while the view or the live dot are still easing */
    paint(snap, dt = 16, now = performance.now()) {
        const { ctx, w, h, dpr } = this;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const tgt = this.target();
        if (!tgt) {
            this.view = null;
            return false;
        }
        const k = snap || this.reduce || !this.view ? 1 : 1 - Math.exp(-dt / 140);
        const v = this.view ?? { ...tgt };
        v.x0 += (tgt.x0 - v.x0) * k;
        v.x1 += (tgt.x1 - v.x1) * k;
        v.y0 += (tgt.y0 - v.y0) * k;
        v.y1 += (tgt.y1 - v.y1) * k;
        this.view = v;
        const last = this.pts[this.pts.length - 1];
        const d = this.dot ?? { x: lg(last.x), c: last.c };
        const kd = snap || this.reduce ? 1 : 1 - Math.exp(-dt / 70);
        d.x += (lg(last.x) - d.x) * kd;
        d.c += (last.c - d.c) * kd;
        this.dot = d;
        const pw = w - PAD.l - PAD.r, ph = h - PAD.t - PAD.b;
        const X = (lx) => PAD.l + ((lx - v.x0) / (v.x1 - v.x0)) * pw;
        const Y = (c) => PAD.t + (1 - (c - v.y0) / (v.y1 - v.y0)) * ph;
        // phase bands
        const edges = [0, this.phaseX[0], this.phaseX[1]];
        ctx.font = "600 12px Archivo, sans-serif";
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        for (let i = 0; i < 3; i++) {
            const from = edges[i];
            if (from === undefined)
                continue;
            const nextDefined = edges.slice(i + 1).find((e) => e !== undefined);
            const a = Math.max(X(lg(from)), PAD.l), b = Math.min(nextDefined !== undefined ? X(lg(nextDefined)) : w - PAD.r, w - PAD.r);
            if (b <= a)
                continue;
            ctx.fillStyle = COLORS.bands[i];
            ctx.fillRect(a, PAD.t, b - a, ph);
            if (b - a > 74) {
                ctx.fillStyle = i === this.curPhase ? COLORS.bandCur : COLORS.bandInk;
                ctx.fillText(LABELS[i], a + 10, PAD.t + 18);
            }
        }
        // grid + y ticks: fixed "nice" values, so labels slide with the scale instead of jumping
        const span = v.y1 - v.y0, raw = span / 4, e10 = 10 ** Math.floor(Math.log10(raw || 1));
        const step = raw / e10 >= 5 ? 5 * e10 : raw / e10 >= 2 ? 2 * e10 : e10;
        ctx.font = "500 12px Archivo, sans-serif";
        ctx.textAlign = "right";
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (let c = Math.ceil(v.y0 / step) * step; c <= v.y1; c += step) {
            const y = Math.round(Y(c)) + 0.5;
            if (y < PAD.t - 1)
                continue;
            ctx.beginPath();
            ctx.moveTo(PAD.l, y);
            ctx.lineTo(w - PAD.r, y);
            ctx.stroke();
            ctx.fillStyle = COLORS.tick;
            ctx.fillText(num(c), PAD.l - 10, y + 4);
        }
        // x ticks
        ctx.textAlign = "center";
        const ticks = this.zoom === "all" ? [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9] : [1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8, 2e8, 5e8];
        let lastTx = -1e9;
        for (const t of ticks) {
            const tx = X(lg(t));
            if (tx < PAD.l - 2 || tx > w - PAD.r + 2 || tx - lastTx < 64)
                continue;
            lastTx = tx;
            ctx.fillText(short(t), tx, h - PAD.b + 20);
        }
        ctx.textAlign = "left";
        ctx.font = "600 12px Archivo, sans-serif";
        ctx.fillStyle = COLORS.axis;
        ctx.fillText("Kosten", PAD.l, PAD.t - 12);
        ctx.textAlign = "right";
        ctx.fillText("Iterationen (logarithmisch)", w - PAD.r, PAD.t - 12);
        // the curve, bucket by bucket (first, extremes, last keeps the envelope honest)
        ctx.save();
        ctx.beginPath();
        ctx.rect(PAD.l, PAD.t - 4, pw, ph + 8);
        ctx.clip();
        const kMin = Math.floor(v.x0 * BUCKETS_PER_DECADE) - 1;
        let i0 = 0;
        for (let lo = 0, hi = this.buckets.length - 1; lo <= hi;) {
            const m = (lo + hi) >> 1;
            if (this.buckets[m].k < kMin) {
                lo = m + 1;
                i0 = lo;
            }
            else
                hi = m - 1;
        }
        const line = new Path2D();
        let started = false, firstX = 0, lastX = 0;
        for (let i = i0; i < this.buckets.length; i++) {
            const b = this.buckets[i];
            const xa = X(lg(b.x0)), xb = X(lg(b.x1));
            if (!started) {
                line.moveTo(xa, Y(b.cFirst));
                firstX = xa;
                started = true;
            }
            else
                line.lineTo(xa, Y(b.cFirst));
            if (b.max !== b.min) {
                line.lineTo((xa + xb) / 2, Y(b.max));
                line.lineTo((xa + xb) / 2, Y(b.min));
            }
            line.lineTo(xb, Y(b.cLast));
            lastX = xb;
        }
        if (started) {
            const area = new Path2D(line);
            area.lineTo(lastX, Y(v.y0));
            area.lineTo(firstX, Y(v.y0));
            area.closePath();
            ctx.fillStyle = COLORS.area;
            ctx.fill(area);
            ctx.strokeStyle = COLORS.line;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = "round";
            ctx.lineCap = "round";
            ctx.stroke(line);
        }
        // best so far: a dashed step line that stays down while a reheat pushes the cost up.
        // Before the first reheat it would only trace the curve, so it starts there.
        const heats = this.reheats.filter((rx) => this.running || rx < last.x);
        const from = heats[0];
        if (from !== undefined && this.best.length) {
            let i0 = 0;
            while (i0 + 1 < this.best.length && this.best[i0 + 1].x <= from)
                i0++;
            ctx.save();
            ctx.setLineDash([5, 4]);
            ctx.strokeStyle = COLORS.best;
            ctx.lineWidth = 1.75;
            ctx.beginPath();
            for (let i = i0; i < this.best.length; i++) {
                const s = this.best[i], n = this.best[i + 1];
                const y = Y(s.c), x = X(lg(i === i0 ? from : s.x));
                if (i === i0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
                ctx.lineTo(n ? X(lg(n.x)) : X(lg(last.x)), y);
            }
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
        // reheats: a dotted amber line with a small arrow (the legend names it), so a jump up has a visible cause.
        // The reheat the backend makes as it pauses is left out: nothing follows it.
        ctx.save();
        for (const rx of heats) {
            const x = Math.round(X(lg(rx))) + 0.5;
            if (x < PAD.l || x > w - PAD.r)
                continue;
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = COLORS.heat;
            ctx.lineWidth = 1.25;
            ctx.beginPath();
            ctx.moveTo(x, PAD.t + 26);
            ctx.lineTo(x, PAD.t + ph);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x - 4, PAD.t + 30);
            ctx.lineTo(x, PAD.t + 24);
            ctx.lineTo(x + 4, PAD.t + 30);
            ctx.strokeStyle = COLORS.heat;
            ctx.lineWidth = 1.75;
            ctx.stroke();
        }
        ctx.restore();
        // the best value, labelled at the right end when it is clearly below the current cost
        const bl = this.best[this.best.length - 1];
        if (bl && last.c - bl.c > (v.y1 - v.y0) * 0.04) {
            ctx.font = "600 12px Archivo, sans-serif";
            ctx.fillStyle = COLORS.bestInk;
            ctx.textAlign = "right";
            haloText(ctx, `Bester Wert ${num(bl.c)}`, X(lg(last.x)) - 12, Y(bl.c) + 16);
        }
        // peak
        const pk = this.peakPt;
        if (pk && this.zoom === "all" && X(lg(pk.x)) >= PAD.l) {
            const px = X(lg(pk.x)), py = Y(pk.c);
            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = COLORS.peak;
            ctx.stroke();
            ctx.font = "600 12px Archivo, sans-serif";
            ctx.fillStyle = COLORS.peakInk;
            ctx.textAlign = "right";
            haloText(ctx, `Höchstwert ${num(pk.c)}`, px - 10, py - 10 < PAD.t + 30 ? py + 18 : py - 10);
        }
        // the live point, gliding
        const dx = X(d.x), dy = Y(d.c);
        if (this.running && !this.reduce) {
            const ph2 = (now % 2200) / 2200;
            ctx.beginPath();
            ctx.arc(dx, dy, 6 + ph2 * 14, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(11,122,132,${0.8 * (1 - ph2)})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(dx, dy, 7, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.line;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff";
        ctx.stroke();
        ctx.font = "800 17px Archivo, sans-serif";
        ctx.fillStyle = COLORS.ink;
        ctx.textAlign = "right";
        haloText(ctx, num(last.c), dx - 12, dy - 16);
        // crosshair + tooltip
        if (this.hoverX !== null) {
            const hx = Math.max(PAD.l, Math.min(w - PAD.r, this.hoverX));
            const lx = v.x0 + ((hx - PAD.l) / pw) * (v.x1 - v.x0);
            const p = this.nearest(lx);
            if (p) {
                const cx = X(lg(p.x)), cy = Y(p.c);
                ctx.save();
                ctx.setLineDash([3, 4]);
                ctx.strokeStyle = COLORS.cross;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(Math.round(cx) + 0.5, PAD.t);
                ctx.lineTo(Math.round(cx) + 0.5, h - PAD.b);
                ctx.stroke();
                ctx.restore();
                ctx.beginPath();
                ctx.arc(cx, cy, 5, 0, Math.PI * 2);
                ctx.fillStyle = "#fff";
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = COLORS.ink;
                ctx.stroke();
                const html = this.describe(p);
                if (this.tip.innerHTML !== html)
                    this.tip.innerHTML = html;
                const tw = this.tip.offsetWidth;
                this.tip.style.transform = `translate(${cx + 16 + tw > w ? cx - tw - 16 : cx + 16}px,${Math.max(PAD.t, cy - 64)}px)`;
                this.tip.style.opacity = "1";
            }
        }
        const easing = Math.abs(tgt.x1 - v.x1) > 0.002 || Math.abs(tgt.y1 - v.y1) > span * 0.002 || Math.abs(tgt.x0 - v.x0) > 0.002
            || Math.abs(lg(last.x) - d.x) > 0.0005 || Math.abs(last.c - d.c) > 0.5;
        return easing;
    }
    nearest(lx) {
        const p = this.pts;
        if (!p.length)
            return undefined;
        let lo = 0, hi = p.length - 1;
        while (lo < hi) {
            const m = (lo + hi) >> 1;
            if (lg(p[m].x) < lx)
                lo = m + 1;
            else
                hi = m;
        }
        const a = p[Math.max(0, lo - 1)], b = p[lo];
        return Math.abs(lg(a.x) - lx) <= Math.abs(lg(b.x) - lx) ? a : b;
    }
}
/** text with a white outline, so the curve never runs through it */
function haloText(ctx, text, x, y) {
    ctx.save();
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.strokeText(text, x, y);
    ctx.restore();
    ctx.fillText(text, x, y);
}
