## Context

The closing sprint review needs a presentation. `documentation/SprintReview_RevealJS/` already contains a full local reveal.js library (`reveal.js/dist`, themes, plugins), but only the library's stock `index.html` demo exists. The effort charts already live as 10 PNG files in `documentation/img/revealJS/`. The deck must be self-contained, runnable by opening an HTML file in a browser (`file://`), with no build step.

## Goals / Non-Goals

**Goals:**
- A single HTML file (`final.html`) that runs against the existing local reveal.js assets.
- Show project metrics via the existing PNG charts.
- Communicate, in German: what we did, learned, achieved, and what is now possible.
- Zero new dependencies; no network access required.

**Non-Goals:**
- No changes to `reveal.js/index.html` (the stock demo stays).
- No regeneration of the chart PNGs; reuse them as-is.
- No backend/frontend code changes.
- No hosting/deployment automation.

## Decisions

- **Standalone `final.html` over editing `index.html`.** Keeps the library demo intact and avoids confusing the deck with library boilerplate. Alternative (overwrite index.html) rejected — clobbers the demo and mixes concerns.
- **German slide text.** The charts are German (`Zeitaufzeichnung`) and the audience is HTBLA Leonding. Alternative (English) rejected for audience mismatch, though the README is English.
- **Reference assets by relative path.** CSS/JS from `reveal.js/dist/` and `reveal.js/plugin/`; images from `../img/revealJS/`. The deck and images sit in sibling folders under `documentation/`.
- **Handle extensionless PNGs.** Six chart files lack a `.png` extension (`Zeitaufzeichnung5/7/8`, `ZeitaufzeichnungSpezifisch/7/8`); they are PNG content. Reference exact filenames and rely on browser content-sniffing. The space in `Insgesamte ZeitaufzeichnungPersonen.png` is URL-encoded as `%20`.
- **Content grounded in the codebase, not invented.** Capability claims (REST resources, simulated annealing with cooling modes/cost degrees, WebSocket live progress, Excel/CSV import-export, teacher constraints) come from inspecting `leo-planer/src/main/java/at/htlleonding/leoplaner/`.

## Risks / Trade-offs

- **Extensionless PNGs may not render in some viewers** → Modern browsers content-sniff `file://` images and render them; verify by opening in a browser. If a viewer refuses, the fallback is to rename copies with `.png`.
- **Hardcoded metrics drift if more commits land** → The deck is a point-in-time snapshot for the final review; numbers (595 commits, 14 contributors) are stated as of 2026-06-03 and need no live updating.
- **Relative paths break if the file is moved** → Keep `final.html` directly in `SprintReview_RevealJS/`; document the path assumption in tasks.
