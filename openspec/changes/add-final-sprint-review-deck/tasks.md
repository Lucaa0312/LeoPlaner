## 1. Scaffold the deck

- [x] 1.1 Create `documentation/SprintReview_RevealJS/final.html` with `<!DOCTYPE html>`, `lang="de"`, and viewport meta
- [x] 1.2 Link local reveal.js assets: `reveal.js/dist/reset.css`, `reveal.js/dist/reveal.css`, a theme from `reveal.js/dist/theme/` (e.g. `black.css`)
- [x] 1.3 Add a `<style>` block for LeoPlaner accent colors, chart framing, stat/grid helpers, and a footer
- [x] 1.4 Add the init `<script>` loading `reveal.js/dist/reveal.js` plus the notes/markdown/highlight plugins and `Reveal.initialize({ hash, slideNumber, transition })`

## 2. Metric slides (existing charts)

- [x] 2.1 Title slide: LeoPlaner — Abschluss Sprint Review, with timeframe
- [x] 2.2 "Zahlen & Fakten" slide: 595 commits, ~7.5 months, 14 contributors, 55 Java classes (point-in-time as of 2026-06-03)
- [x] 2.3 Commits slide: embed `../img/revealJS/CommitsOverall.png` and `CommitsOverallPersonen.png`
- [x] 2.4 Working-time slide: embed `InsgesamteZeitaufzeichnung.png` and `Insgesamte%20ZeitaufzeichnungPersonen.png` (URL-encode the space)
- [x] 2.5 Per-sprint section: embed `Zeitaufzeichnung5/7/8` and `ZeitaufzeichnungSpezifisch7/8` by exact extensionless filenames

## 3. Narrative slides (German, grounded in code)

- [x] 3.1 "Was wir gemacht haben": data management, REST API, simulated annealing, Excel/CSV, live UI
- [x] 3.2 "Was wir gelernt haben": optimization algorithms, Quarkus/Jakarta, WebSockets, TypeScript, team git workflow
- [x] 3.3 "Was wir erreicht haben": working timetable generator, constraints, import/export, live visualization
- [x] 3.4 "Was jetzt möglich ist": new constraints via cost-degree system, algorithm tuning, scaling, API integration
- [x] 3.5 Closing "Danke / Fragen?" slide

## 4. Verify

- [x] 4.1 Open `final.html` in a browser and step through every slide
- [x] 4.2 Confirm all 10 charts render (including extensionless and space-containing filenames)
- [x] 4.3 Confirm `reveal.js/index.html` demo is unchanged and no network requests fail
