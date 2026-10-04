// Anmelden / Registrieren: design only (FR-19 to FR-22). The backend has no auth endpoints yet
// (BACKEND_TODO #9), so a valid form explains that instead of pretending to sign in.
// #registrieren opens the registration, which has two short steps: Zugang, then Schule.
import { el, icon } from "../glas/ui.js";
const $ = (s) => el(s);
const root = $(".auth");
let mode = "in";
let step = 1;
const TEXT = {
    in: { eyebrow: "Anmelden", title: "Willkommen zurück.", lead: "Melden Sie sich an, um die Stundenplanung Ihrer Schule fortzusetzen.", swap: "Noch kein Konto?", swapBtn: "Konto anlegen", swapHref: "#registrieren" },
    up: { eyebrow: "Registrieren", title: "Ein Konto für Ihre Schule.", lead: "Zwei kurze Schritte, dann können Sie die Daten Ihrer Schule importieren.", swap: "Schon ein Konto?", swapBtn: "Anmelden", swapHref: "#anmelden" },
};
function render(focus = false) {
    root.dataset.mode = mode;
    root.dataset.step = String(step);
    const t = TEXT[mode];
    $("[data-eyebrow]").textContent = mode === "up" ? `${t.eyebrow} · Schritt ${step} von 2` : t.eyebrow;
    $("[data-title]").textContent = t.title;
    $("[data-lead]").textContent = t.lead;
    $("[data-swap-text]").textContent = t.swap;
    const swap = $("[data-swap]");
    swap.firstChild.textContent = t.swapBtn;
    swap.href = t.swapHref;
    document.querySelectorAll("[data-only]").forEach((f) => { f.hidden = f.dataset.only !== mode; });
    document.querySelectorAll("[data-pane]").forEach((p) => { p.hidden = p.dataset.pane !== String(step); });
    document.querySelectorAll("[data-s]").forEach((li) => {
        const n = Number(li.dataset.s);
        li.className = n < step ? "done" : n === step ? "now" : "";
        li.querySelector(".mark").innerHTML = n < step ? icon("check", "ic mk") : String(n);
    });
    $("[data-card-title]").textContent = mode === "in" ? "Mit E-Mail anmelden" : step === 1 ? "Zugang festlegen" : "Ihre Schule";
    $("[data-submit]").textContent = mode === "in" ? "Anmelden" : step === 1 ? "Weiter" : "Konto anlegen";
    $("[data-back]").hidden = !(mode === "up" && step === 2);
    $("#lg-pw").autocomplete = mode === "in" ? "current-password" : "new-password";
    document.title = `${mode === "in" ? "Anmelden" : "Registrieren"} · LeoPlaner`;
    $("[data-msg]").innerHTML = "";
    if (focus)
        $(step === 2 ? "#lg-name" : "#lg-mail").focus();
}
function fromHash() {
    const m = location.hash === "#registrieren" ? "up" : "in";
    if (m !== mode) {
        mode = m;
        step = 1;
        clearErrors();
    }
    render();
}
addEventListener("hashchange", () => { fromHash(); $(step === 2 ? "#lg-name" : "#lg-mail").focus(); });
$("[data-forgot]").addEventListener("click", (e) => { e.preventDefault(); notWired("Passwort zurücksetzen"); });
$("[data-back]").addEventListener("click", () => { step = 1; render(true); });
// show / hide password (both fields when registering)
const pw = $("#lg-pw"), pw2 = $("#lg-pw2"), eye = $("[data-eye]");
const setEye = (show) => {
    pw.type = pw2.type = show ? "text" : "password";
    eye.innerHTML = icon(show ? "eyeOff" : "eye");
    eye.setAttribute("aria-pressed", String(show));
    eye.setAttribute("aria-label", show ? "Passwort verbergen" : "Passwort anzeigen");
};
setEye(false);
eye.addEventListener("click", () => { setEye(pw.type === "password"); pw.focus(); });
// caps lock hint while typing a password
const caps = $("[data-caps]");
for (const f of [pw, pw2]) {
    f.addEventListener("keydown", (e) => { caps.hidden = !e.getModifierState("CapsLock"); });
    f.addEventListener("blur", () => { caps.hidden = true; });
}
// password rules for a new account
const RULES = {
    len: (v) => v.length >= 8,
    mix: (v) => /\p{Ll}/u.test(v) && /\p{Lu}/u.test(v),
    num: (v) => /[^\p{L}]/u.test(v),
};
const passed = (v) => Object.values(RULES).filter((r) => r(v)).length;
pw.addEventListener("input", () => {
    const v = pw.value;
    for (const [k, r] of Object.entries(RULES))
        $(`[data-rule=${k}]`).classList.toggle("ok", r(v));
    $("[data-meter]").dataset.level = v ? String(passed(v)) : "0";
    if (errs["lg-pw2"] && pw2.value === v)
        fieldError("lg-pw2", "");
});
// validation: inline per field, checked on submit and cleared while typing
const errs = {};
function fieldError(id, text) {
    errs[id] = text;
    const input = $(`#${id}`), p = $(`[data-err=${id}]`);
    p.id ||= `${id}-err`;
    p.textContent = text;
    input.toggleAttribute("aria-invalid", !!text);
    if (text)
        input.setAttribute("aria-errormessage", p.id);
    else
        input.removeAttribute("aria-errormessage");
}
function clearErrors() {
    document.querySelectorAll("[data-err]").forEach((p) => fieldError(p.dataset.err, ""));
}
function check() {
    const out = [];
    if (step === 1) {
        const mail = $("#lg-mail");
        if (!mail.value.trim())
            out.push(["lg-mail", "Bitte die E-Mail-Adresse eingeben."]);
        else if (!mail.checkValidity())
            out.push(["lg-mail", "Diese E-Mail-Adresse ist nicht gültig."]);
        if (!pw.value)
            out.push(["lg-pw", "Bitte das Passwort eingeben."]);
        else if (mode === "up" && passed(pw.value) < 3)
            out.push(["lg-pw", "Das Passwort erfüllt noch nicht alle Regeln."]);
        if (mode === "up" && pw.value && pw2.value !== pw.value)
            out.push(["lg-pw2", pw2.value ? "Die Passwörter stimmen nicht überein." : "Bitte das Passwort wiederholen."]);
    }
    else {
        if (!$("#lg-name").value.trim())
            out.push(["lg-name", "Bitte Ihren Namen eingeben."]);
        if (!$("#lg-school").value.trim())
            out.push(["lg-school", "Bitte die Schule eingeben."]);
    }
    return out;
}
$("[data-form]").addEventListener("input", (e) => {
    const id = e.target.id;
    if (errs[id])
        fieldError(id, "");
});
$("[data-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    $("[data-msg]").innerHTML = "";
    clearErrors();
    const bad = check();
    for (const [id, text] of bad)
        fieldError(id, text);
    if (bad.length) {
        $(`#${bad[0][0]}`).focus();
        return;
    }
    if (mode === "up" && step === 1) {
        step = 2;
        render(true);
        return;
    }
    notWired(mode === "in" ? "Anmelden" : "Registrieren");
});
function notWired(what) {
    $("[data-msg]").innerHTML = `<div class="banner banner-warn" role="alert">${icon("lock")}<span>${what} ist noch nicht angeschlossen. Sie können ohne Anmeldung weiterarbeiten.</span></div>`;
}
fromHash();
