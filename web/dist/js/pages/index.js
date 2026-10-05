// Startseite (root index.html): pitch, the self-sorting demo week, and the four steps.
// It is the public page before the login, so it shows no school data and calls no backend.
import { mountDemo } from "../glas/demo.js";
import { el } from "../glas/ui.js";
const demo = mountDemo(el("[data-demo]"));
el("[data-replay]").addEventListener("click", () => demo.play());
// wait for the fonts so the tiles are measured at their final size
void document.fonts.ready.then(() => setTimeout(() => demo.play(), 250));
