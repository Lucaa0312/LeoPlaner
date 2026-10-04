// The Glas app shell: process sidebar (Option A "Leitfaden") with live step status, and arrival.
import { icon } from "./ui.js";
import { store } from "./store.js";
import { countBy, runChecks, summaryText } from "./checks.js";
const STEPS = [
    { key: "import", n: 1, label: "Import", href: "./import.html" },
    { key: "pruefung", n: 2, label: "Prüfung", href: "./pruefung.html" },
    { key: "optimierung", n: 3, label: "Optimierung", href: "./optimierung.html" },
    { key: "ergebnis", n: 4, label: "Ergebnis & Export", href: "./ergebnis.html" },
];
const DATA = [
    { key: "lehrer", label: "Lehrer", href: "./lehrer.html" },
    { key: "klassen", label: "Klassen", href: "./klassen.html" },
    { key: "faecher", label: "Fächer", href: "./faecher.html" },
    { key: "raeume", label: "Räume", href: "./raeume.html" },
];
export function renderShell(opts) {
    const nav = document.querySelector(".nav");
    if (!nav)
        throw new Error("Element fehlt: .nav");
    const cur = (k) => (k === opts.active ? ' aria-current="page"' : "");
    nav.innerHTML = `
    <a class="brand" href="./uebersicht.html" aria-label="LeoPlaner, zur Übersicht"><span class="logo"></span></a>
    <a href="./uebersicht.html"${cur("uebersicht")}>${icon("home")}<span>Übersicht</span></a>
    <div class="sec">Planung</div>
    <nav aria-label="Planung">${STEPS.map((s) => `<a class="step is-${s.key === opts.active ? "active" : "open"}" href="${s.href}" data-step="${s.key}"${cur(s.key)}>
      <span class="mark">${s.n}</span><span>${s.label}</span><span class="meta"></span></a>`).join("")}</nav>
    <div class="sec">Stammdaten</div>
    <nav aria-label="Stammdaten">${DATA.map((d) => `<a href="${d.href}" data-data="${d.key}"${cur(d.key)}><span>${d.label}</span><span class="cnt" data-count="${d.key}"></span></a>`).join("")}</nav>
    <div class="foot">
      <a href="#" aria-disabled="true" title="Hilfe folgt" data-help>${icon("help")}<span>Hilfe</span></a>
      <a href="./anmelden.html"${cur("konto")}>${icon("user")}<span>Konto · Admin</span></a>
    </div>`;
    nav.querySelector("[data-help]").addEventListener("click", (e) => e.preventDefault());
    const setStep = (key, state, meta) => {
        const a = nav.querySelector(`[data-step="${key}"]`);
        if (!a)
            return;
        const n = STEPS.find((s) => s.key === key)?.n ?? 0;
        // the page you are on stays "active"; its mark still says done or error
        const shown = key === opts.active ? "active" : state;
        a.className = `step is-${shown}${key === opts.active && state !== "active" ? ` was-${state}` : ""}`;
        a.querySelector(".mark").innerHTML = state === "done" && key !== opts.active ? icon("check", "mk") : String(n);
        a.querySelector(".meta").textContent = meta;
    };
    const refresh = () => {
        // counts and status are a nicety: if the server is down they simply stay empty
        const setCount = (k, v) => { const t = nav.querySelector(`[data-count="${k}"]`); if (t)
            t.textContent = String(v); };
        store.all().then((d) => {
            setCount("lehrer", d.teachers.length);
            setCount("klassen", d.classes.length);
            setCount("faecher", d.subjects.length);
            setCount("raeume", d.rooms.length);
            const has = d.classSubjects.length > 0;
            const skip = (k) => !!opts.ownsStep && k === opts.active;
            if (!skip("import"))
                setStep("import", has ? "done" : "open", has ? "Daten da" : "");
            const fs = has ? runChecks(d) : [];
            const { errors } = countBy(fs);
            if (!skip("pruefung"))
                setStep("pruefung", !has ? "open" : errors ? "error" : "done", has ? (errors ? `${errors} Fehler` : summaryText(fs) === "Keine Probleme" ? "Keine Fehler" : summaryText(fs)) : "");
            return Promise.all([store.isRunning(), store.hasRunBefore()]).then(([running, ran]) => {
                if (!skip("optimierung"))
                    setStep("optimierung", running ? "active" : ran && has ? "done" : "open", running ? "Läuft" : ran && has ? "Fertig" : "");
                if (!skip("ergebnis"))
                    setStep("ergebnis", "open", "");
            });
        }).catch(() => { });
    };
    refresh();
    return { setStep, refresh };
}
