// 2 Prüfung: the pre-run check, grouped by rule, every finding linked to the entry that causes it.
import { renderShell } from "../glas/shell.js";
import { busy, el, esc, icon } from "../glas/ui.js";
import { store } from "../glas/store.js";
import { countBy, ENTITY_WORD, findingHref, RULES, runChecks, summaryText, type Finding } from "../glas/checks.js";

const shell = renderShell({ active: "pruefung", ownsStep: true });
const page = el("[data-page]");
const recheck = el<HTMLButtonElement>("[data-recheck]");
recheck.innerHTML = `${icon("redo")}<span class="lbl">Neu prüfen</span>`;
let filter: "all" | "error" = "all";
let findings: Finding[] = [];

function setChip(state: string, text: string): void {
  el("[data-chip]").dataset.state = state;
  el("[data-chip-text]").textContent = text;
}

function render(): void {
  const { errors, warns } = countBy(findings);
  const tone = errors ? "error" : warns ? "warn" : "ok";
  const verdict = errors
    ? { h: `${errors} ${errors === 1 ? "Fehler muss" : "Fehler müssen"} behoben werden`, p: "Mit diesen Fehlern entsteht kein brauchbarer Plan. Öffnen Sie den Eintrag, beheben Sie ihn und prüfen Sie neu." }
    : warns
      ? { h: "Keine Fehler. Die Optimierung kann starten.", p: `Es gibt ${warns} ${warns === 1 ? "Hinweis" : "Hinweise"}. Sie verhindern den Start nicht, können den Plan aber verschlechtern.` }
      : { h: "Alles in Ordnung", p: "Die Prüfung hat keine Probleme gefunden. Die Optimierung kann starten." };
  const shown = filter === "error" ? findings.filter((f) => f.sev === "error") : findings;
  const groups = new Map<string, Finding[]>();
  for (const f of shown) groups.set(f.rule, [...(groups.get(f.rule) ?? []), f]);

  page.innerHTML = `
    <section class="verdict glass ${tone}" data-arrive style="--o:1">
      <span class="big">${icon(errors ? "alert" : warns ? "info" : "check")}</span>
      <div><h2>${esc(verdict.h)}</h2><p>${esc(verdict.p)}</p></div>
      <div class="btns">${errors ? "" : `<a class="btn btn-dark" href="./optimierung.html">Zur Optimierung ${icon("arrow")}</a>`}</div>
    </section>
    ${[...groups].map(([rule, fs], i) => {
      const r = RULES[rule]!;
      const sev = fs[0]!.sev;
      return `<section class="glass panel group" data-arrive style="--o:${i + 2}">
        <h3><span class="sev ${sev}">${icon(sev === "error" ? "alert" : "info")}</span>${esc(r.label)} <span class="badge ${sev === "error" ? "err" : "warn"}">${fs.length}</span></h3>
        <p class="why">${esc(r.why)}</p>
        <ul class="rows">${fs.map((f) => `<li><span class="t"><span class="tag">${esc(f.tag)}</span> ${esc(f.text)}</span><a class="link" href="${findingHref(f)}">${ENTITY_WORD[f.kind]} öffnen ${icon("arrow")}</a></li>`).join("")}</ul>
      </section>`;
    }).join("")}
    ${filter === "error" && !shown.length && findings.length ? `<section class="glass panel"><p class="muted">Keine Fehler. Die ${warns} ${warns === 1 ? "Hinweis ist" : "Hinweise sind"} ausgeblendet.</p></section>` : ""}
    <p class="hint" style="padding:0 6px">Diese Prüfung läuft im Browser auf den Stammdaten. Der Server prüft noch nicht selbst (siehe Backend-Liste). Was der Import gemeldet hat, steht im <a class="link" href="./import.html#bericht">Importbericht</a>.</p>`;
  setChip(errors ? "error" : warns ? "paused" : "done", summaryText(findings));
  shell.setStep("pruefung", errors ? "error" : "done", errors ? `${errors} Fehler` : "Keine Fehler");
}

async function load(): Promise<void> {
  try {
    const d = await store.all();
    if (!d.classSubjects.length && !d.teachers.length) {
      setChip("loading", "Keine Daten");
      page.innerHTML = `<section class="glass state"><div><b>Noch nichts zu prüfen</b><p>Es sind noch keine Stammdaten vorhanden. Importieren Sie zuerst die Daten des Schuljahres.</p><a class="btn btn-dark" href="./import.html">Zum Import ${icon("arrow")}</a></div></section>`;
      shell.setStep("pruefung", "open", "");
      return;
    }
    findings = runChecks(d);
    render();
  } catch {
    setChip("error", "Server offline");
    page.innerHTML = `<section class="glass state"><div><b>Server nicht erreichbar</b><p>Die Prüfung braucht die Stammdaten vom Server.</p><button type="button" class="btn btn-dark" data-retry>${icon("redo")}Erneut versuchen</button></div></section>`;
    el("[data-retry]").addEventListener("click", () => void load());
  }
}

recheck.addEventListener("click", async () => {
  const restore = busy(recheck, "Prüft …");
  store.invalidate();
  await load();
  shell.refresh();
  restore();
});
el("[data-filter]").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-f]");
  if (!b) return;
  filter = b.dataset.f === "error" ? "error" : "all";
  el("[data-filter]").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  render();
});

void load();
