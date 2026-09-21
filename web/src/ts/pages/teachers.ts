import initNavbar from "./navbar.js";
import type {
  CreateTeacherRequest,
  Teacher,
  TeacherFormState,
  TeacherFormStep,
} from "../types/teacher.js";
import {
  createTeacher,
  fetchTeachers,
  updateTeacher,
} from "../api/teacherApi.js";
import {
  renderEmptyState,
  toggleEmptyState,
} from "../components/emptyState.js";
import {
  getElement,
  aquireElement,
  formatName,
} from "../utils/elementHelpers.js";
import { buildModal, closeModal, openModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { clearSkeleton, renderSkeleton } from "../components/skeleton.js";
import { imagePreview } from "../features/imagePreview.js";
import type { Subject } from "../types/subject.js";
import { fetchSubjects } from "../api/subjectApi.js";
import { initSubjectSelector } from "../features/subjectSelector.js";
import { initSetAvailability } from "../features/availabilitySelector.js";
import { applySearch, bindSearch } from "../features/searchElement.js";

const SEARCH = {
  inputId: "input-field",
  rowSelector: ".teacher-row",
  values: [".teacher-name", ".teacher-initials", ".subject-chip"],
  noResultsEl: null as HTMLElement | null,
};

// ---------------------------------------------------------------- helpers

// Deterministic tint for the initials avatar: blends the two brand colours
// so every teacher gets one of a few brand-adjacent tones.
function avatarTone(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const steps = [100, 66, 33, 0];
  return steps[hash % steps.length] ?? 100;
}

function initialsOf(teacher: Teacher): string {
  if (teacher.nameSymbol) return teacher.nameSymbol.slice(0, 3);
  return teacher.teacherName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2);
}

function createAvatar(teacher: Teacher): HTMLElement {
  const avatar = document.createElement("span");
  avatar.className = "avatar avatar--tinted";
  avatar.style.setProperty("--tone", `${avatarTone(teacher.teacherName)}%`);
  avatar.textContent = initialsOf(teacher);
  avatar.setAttribute("aria-hidden", "true");
  return avatar;
}

// --------------------------------------------------------- subject chips

function createTeacherSubjectChips(
  subjects: Teacher["teachingSubject"],
): string {
  const visibleSubjects = subjects.slice(0, 3);
  const hiddenSubjects = subjects.slice(3);
  const remaining = subjects.length - visibleSubjects.length;

  let chips = visibleSubjects
    .map(
      (subject) =>
        `<span class="chip chip--soft subject-chip" title="${formatName(subject.subjectName)}">${subject.subjectSymbol.toUpperCase()}</span>`,
    )
    .join("");

  if (remaining > 0) {
    chips += `<button type="button" class="chip chip--more subject-chip extra" aria-label="${remaining} weitere Fächer anzeigen">+${remaining}</button>`;
  }

  chips += hiddenSubjects
    .map(
      (subject) =>
        `<span class="chip chip--soft subject-chip hidden-subject" hidden title="${formatName(subject.subjectName)}">${subject.subjectSymbol.toUpperCase()}</span>`,
    )
    .join("");

  return chips;
}

function showRemainingSubjects(container: HTMLElement): void {
  container
    .querySelectorAll<HTMLElement>(".hidden-subject")
    .forEach((chip) => (chip.hidden = false));
  const extraChip = container.querySelector<HTMLElement>(".subject-chip.extra");
  if (extraChip) extraChip.hidden = true;
}

function closeAllTeachers(): void {
  document
    .querySelectorAll<HTMLElement>(".teacher-subjects")
    .forEach((container) => {
      container
        .querySelectorAll<HTMLElement>(".hidden-subject")
        .forEach((chip) => (chip.hidden = true));
      const extraChip = container.querySelector<HTMLElement>(
        ".subject-chip.extra",
      );
      if (extraChip) extraChip.hidden = false;
    });
}

// ---------------------------------------------------------- availability

function createAvailabilityCell(teacher: Teacher): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "teacher-availability";

  const blocked = teacher.teacherNonWorkingHours?.length ?? 0;
  const disliked = teacher.teacherNonPreferredHours?.length ?? 0;

  if (blocked === 0 && disliked === 0) {
    wrap.innerHTML = `<span class="badge badge--success"><i class="ti ti-check" aria-hidden="true"></i>Immer verfügbar</span>`;
    return wrap;
  }

  if (blocked > 0) {
    wrap.innerHTML += `<span class="badge badge--danger" title="Stunden, in denen die Lehrkraft nicht verfügbar ist"><i class="ti ti-calendar-off" aria-hidden="true"></i>${blocked} gesperrt</span>`;
  }
  if (disliked > 0) {
    wrap.innerHTML += `<span class="badge badge--accent" title="Stunden, die die Lehrkraft ungern unterrichtet"><i class="ti ti-clock" aria-hidden="true"></i>${disliked} ungern</span>`;
  }
  return wrap;
}

// ------------------------------------------------------------------ table

function createTableHead(): HTMLTableSectionElement {
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>
      <th scope="col" id="teacher-left-section">Name</th>
      <th scope="col" id="teacher-initials-section">K&uuml;rzel</th>
      <th scope="col" id="teacher-subjects-section">F&auml;cher</th>
      <th scope="col" id="teacher-workload-section">Verf&uuml;gbarkeit</th>
      <th scope="col" class="is-actions" id="teacher-edit-section"><span class="visually-hidden">Aktionen</span></th>
    </tr>`;
  return thead;
}

function createTeacherRow(teacher: Teacher): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = "teacher-row";

  // name
  const nameCell = document.createElement("td");
  const primary = document.createElement("div");
  primary.className = "cell-primary";

  const text = document.createElement("div");
  text.className = "cell-primary__text";

  const name = document.createElement("span");
  name.className = "cell-primary__title teacher-name";
  name.textContent = teacher.teacherName;

  const sub = document.createElement("span");
  sub.className = "cell-primary__sub";
  const count = teacher.teachingSubject.length;
  sub.textContent =
    count === 0 ? "Keine Fächer" : count === 1 ? "1 Fach" : `${count} Fächer`;

  text.append(name, sub);
  primary.append(createAvatar(teacher), text);
  nameCell.appendChild(primary);

  // initials
  const initialsCell = document.createElement("td");
  const initials = document.createElement("span");
  initials.className = "badge badge--mono teacher-initials";
  initials.textContent = teacher.nameSymbol;
  initialsCell.appendChild(initials);

  // subjects
  const subjectsCell = document.createElement("td");
  const subjects = document.createElement("div");
  subjects.className = "chip-list teacher-subjects";
  subjects.innerHTML = createTeacherSubjectChips(teacher.teachingSubject);
  subjects.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".extra")) {
      closeAllTeachers();
      showRemainingSubjects(subjects);
    }
  });
  subjectsCell.appendChild(subjects);

  // availability
  const availabilityCell = document.createElement("td");
  availabilityCell.appendChild(createAvailabilityCell(teacher));

  // actions
  const actionsCell = document.createElement("td");
  actionsCell.className = "is-actions";
  const actions = document.createElement("div");
  actions.className = "row-actions";

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "icon-btn icon-btn--primary teacher-edit";
  edit.title = `${teacher.teacherName} bearbeiten`;
  edit.setAttribute("aria-label", edit.title);
  edit.innerHTML = `<i class="ti ti-pencil" aria-hidden="true"></i>`;
  edit.addEventListener("click", () => {
    void openAddTeacherForm(teacher);
  });

  actions.appendChild(edit);
  actionsCell.appendChild(actions);

  row.append(nameCell, initialsCell, subjectsCell, availabilityCell, actionsCell);
  return row;
}

let firstLoad = true;

async function loadAndRenderTeachers(): Promise<void> {
  const noTeachersElement = getElement<HTMLElement>("no-teachers");
  const teachersContainer = getElement<HTMLElement>("display-teachers");
  if (!noTeachersElement || !teachersContainer) return;

  if (firstLoad) {
    renderSkeleton(teachersContainer, 6, "row");
  }

  try {
    const teachers = await fetchTeachers();
    firstLoad = false;

    clearSkeleton(teachersContainer);
    teachersContainer.replaceChildren();
    toggleEmptyState(noTeachersElement, teachers.length > 0);
    if (SEARCH.noResultsEl) SEARCH.noResultsEl.hidden = true;

    if (teachers.length === 0) return;

    const wrap = document.createElement("div");
    wrap.className = "table-wrap rise-in";

    const table = document.createElement("table");
    table.className = "data-table teacher-table";
    table.appendChild(createTableHead());

    const tbody = document.createElement("tbody");
    teachers.forEach((teacher) => tbody.appendChild(createTeacherRow(teacher)));
    table.appendChild(tbody);

    wrap.appendChild(table);
    teachersContainer.appendChild(wrap);

    // keep an active search query applied across re-renders
    applySearch(SEARCH);
  } catch (error) {
    firstLoad = false;
    clearSkeleton(teachersContainer);
    console.error("Fehler beim Laden der Lehrer: " + error);
  }
}

// ------------------------------------------------------------------- form

function collectTeacherData(state: TeacherFormState): CreateTeacherRequest {
  return {
    teacherName: `${state.firstName} ${state.lastName}`,
    nameSymbol: state.nameSymbol,
    teachingSubject: state.selectedSubjects.map((subject) => ({
      id: subject.id,
    })),
    teacher_non_working_hours: state.nonWorkingHours,
    teacher_non_preferred_hours: state.nonPreferredHours,
  };
}

const STEP_TITLES: Record<TeacherFormStep, string> = {
  1: "Stammdaten",
  2: "Fächer",
  3: "Verfügbarkeit",
};

function buildStepIndicator(currentStep: TeacherFormStep): HTMLElement {
  const container = document.createElement("div");
  container.className = "stepper";
  container.id = "step-indicator";
  container.setAttribute("aria-label", `Schritt ${currentStep} von 3`);

  const steps = [1, 2, 3] as const;

  steps.forEach((step, index) => {
    const item = document.createElement("div");
    item.className = "stepper__step";
    if (step === currentStep) item.classList.add("is-active");
    if (step < currentStep) item.classList.add("is-done");

    const dot = document.createElement("span");
    dot.className = "stepper__dot";
    dot.innerHTML =
      step < currentStep
        ? `<i class="ti ti-check" aria-hidden="true"></i>`
        : String(step);

    const label = document.createElement("span");
    label.className = "stepper__label";
    label.textContent = STEP_TITLES[step];

    item.append(dot, label);
    container.appendChild(item);

    if (index < steps.length - 1) {
      const line = document.createElement("span");
      line.className = "stepper__line";
      if (step < currentStep) line.classList.add("is-done");
      container.appendChild(line);
    }
  });

  return container;
}

type NavigationButtonsConfig = {
  showBack: boolean;
  nextLabel: string;
  nextIcon?: string;
  onBack?: () => void;
  onNext: () => void;
};

function buildNavigationButtons(config: NavigationButtonsConfig): HTMLElement[] {
  const buttons: HTMLElement[] = [];

  if (config.showBack && config.onBack) {
    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.id = "back-teacher-btn";
    backButton.className = "btn btn--ghost";
    backButton.innerHTML = `<i class="ti ti-chevron-left" aria-hidden="true"></i><span>Zurück</span>`;
    backButton.addEventListener("click", () => config.onBack!());
    buttons.push(backButton);
  }

  const spacer = document.createElement("span");
  spacer.className = "spacer";
  buttons.push(spacer);

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.id = "submit-teacher-btn";
  nextButton.className = "btn btn--primary";
  nextButton.innerHTML = `<span>${config.nextLabel}</span><i class="${config.nextIcon ?? "ti ti-arrow-right"}" aria-hidden="true"></i>`;
  nextButton.addEventListener("click", () => config.onNext());
  buttons.push(nextButton);

  return buttons;
}

function buildAvatarUploadSection(): HTMLElement {
  const avatarUploadDiv = document.createElement("div");
  avatarUploadDiv.className = "avatar-upload";

  const teacherImageInput = document.createElement("input");
  teacherImageInput.type = "file";
  teacherImageInput.id = "teacher-image-input";
  teacherImageInput.name = "teacher-image";
  teacherImageInput.accept = "image/*";
  teacherImageInput.className = "visually-hidden";

  const avatarLabel = document.createElement("label");
  avatarLabel.htmlFor = "teacher-image-input";
  avatarLabel.className = "avatar-label";
  avatarLabel.title = "Profilbild auswählen";

  const avatarPreview = document.createElement("img");
  avatarPreview.id = "avatar-preview";
  avatarPreview.src = "../assets/img/userPreview.svg";
  avatarPreview.alt = "";

  const camera = document.createElement("span");
  camera.className = "avatar-label__badge";
  camera.innerHTML = `<i class="ti ti-photo-up" aria-hidden="true"></i>`;

  avatarLabel.append(avatarPreview, camera);

  const textWrap = document.createElement("div");
  textWrap.className = "avatar-upload__text";
  textWrap.innerHTML = `
    <p class="avatar-upload__title">Profilbild hochladen</p>
    <p class="avatar-upload__hint">Optional · PNG oder JPG</p>`;

  avatarUploadDiv.append(teacherImageInput, avatarLabel, textWrap);
  return avatarUploadDiv;
}

function buildField(
  id: string,
  label: string,
  placeholder: string,
  value: string,
  options: { required?: boolean; hint?: string; maxLength?: number } = {},
): HTMLElement {
  const field = document.createElement("div");
  field.className = "field";

  const labelEl = document.createElement("label");
  labelEl.className = "field__label";
  labelEl.htmlFor = id;
  labelEl.innerHTML = options.required
    ? `${label}<span class="req" aria-hidden="true">*</span>`
    : label;

  const input = document.createElement("input");
  input.type = "text";
  input.id = id;
  input.name = id;
  input.className = "input";
  input.placeholder = placeholder;
  input.value = value;
  input.autocomplete = "off";
  if (options.required) input.required = true;
  if (options.maxLength) input.maxLength = options.maxLength;

  field.append(labelEl, input);

  if (options.hint) {
    const hint = document.createElement("span");
    hint.className = "field__hint";
    hint.textContent = options.hint;
    field.appendChild(hint);
  }

  return field;
}

function buildStep1(state: TeacherFormState): HTMLElement {
  const container = document.createElement("div");
  container.id = "step-1-container";

  container.appendChild(buildAvatarUploadSection());

  const form = document.createElement("form");
  form.id = "add-teacher-form";
  form.className = "form-grid";
  form.addEventListener("submit", (event) => event.preventDefault());

  form.append(
    buildField("first-name-input", "Vorname", "z. B. Maria", state.firstName, {
      required: true,
    }),
    buildField("last-name-input", "Nachname", "z. B. Musterfrau", state.lastName, {
      required: true,
    }),
    buildField("initials-input", "Kürzel", "z. B. MUM", state.nameSymbol, {
      required: true,
      hint: "Erscheint im Stundenplan.",
      maxLength: 6,
    }),
  );

  container.appendChild(form);
  return container;
}

async function buildStep2(state: TeacherFormState): Promise<HTMLElement> {
  const container = document.createElement("div");
  container.id = "step-2-container";

  const intro = document.createElement("p");
  intro.className = "form-intro";
  intro.textContent =
    "Welche Fächer unterrichtet diese Lehrkraft? Tippen Sie, um zu suchen, und wählen Sie aus der Liste.";

  const addSubjectsContainer = document.createElement("div");
  addSubjectsContainer.id = "add-subjects-container";
  addSubjectsContainer.className = "combo";

  const subjectInputContainer = document.createElement("div");
  subjectInputContainer.id = "subject-input-container";
  subjectInputContainer.className = "combo__input";

  const icon = document.createElement("i");
  icon.className = "ti ti-search";
  icon.setAttribute("aria-hidden", "true");

  const subjectInput = document.createElement("input");
  subjectInput.type = "text";
  subjectInput.id = "subject-input";
  subjectInput.className = "input";
  subjectInput.placeholder = "Fach suchen …";
  subjectInput.autocomplete = "off";
  subjectInput.setAttribute("aria-label", "Fach suchen");

  subjectInputContainer.append(icon, subjectInput);

  const subjectDropdown = document.createElement("div");
  subjectDropdown.id = "subject-dropdown";
  subjectDropdown.className = "combo__menu";
  subjectDropdown.setAttribute("role", "listbox");

  const selectedLabel = document.createElement("p");
  selectedLabel.className = "form-section__title";
  selectedLabel.textContent = "Ausgewählte Fächer";

  const selectedSubjectsContainer = document.createElement("div");
  selectedSubjectsContainer.id = "selected-subjects";
  selectedSubjectsContainer.className = "chip-list chip-list--boxed";
  selectedSubjectsContainer.dataset.empty = "Noch keine Fächer ausgewählt";

  addSubjectsContainer.append(subjectInputContainer, subjectDropdown);
  container.append(
    intro,
    addSubjectsContainer,
    selectedLabel,
    selectedSubjectsContainer,
  );

  const allSubjects: Subject[] = await fetchSubjects();

  const subjectSelector = initSubjectSelector({
    input: subjectInput,
    dropdown: subjectDropdown,
    selectedContainer: selectedSubjectsContainer,
    inputContainer: subjectInputContainer,
    allSubjects: allSubjects,
  });

  state.selectedSubjects.forEach((subject) => {
    subjectSelector.restore?.(subject);
  });

  (container as any)._subjectSelector = subjectSelector;

  return container;
}

const periods = [
  { start: "07:05", end: "07:55", label: "0. EH" },
  { start: "08:00", end: "08:50", label: "1. EH" },
  { start: "08:55", end: "09:45", label: "2. EH" },
  { start: "10:00", end: "10:50", label: "3. EH" },
  { start: "10:55", end: "11:45", label: "4. EH" },
  { start: "11:50", end: "12:40", label: "5. EH" },
  { start: "12:45", end: "13:35", label: "6. EH" },
  { start: "13:40", end: "14:30", label: "7. EH" },
  { start: "14:35", end: "15:25", label: "8. EH" },
  { start: "15:30", end: "16:20", label: "9. EH" },
  { start: "16:25", end: "17:15", label: "10. EH" },
  { start: "17:20", end: "18:05", label: "11. EH" },
  { start: "18:05", end: "18:50", label: "12. EH" },
  { start: "19:00", end: "19:45", label: "13. EH" },
  { start: "19:45", end: "20:30", label: "14. EH" },
  { start: "20:40", end: "21:25", label: "15. EH" },
  { start: "21:25", end: "22:10", label: "16. EH" },
];

function buildStep3(state: TeacherFormState): HTMLElement {
  const container = document.createElement("div");
  container.id = "step-3-container";

  const intro = document.createElement("p");
  intro.className = "form-intro";
  intro.textContent =
    "Markieren Sie Stunden, in denen die Lehrkraft nicht oder nur ungern unterrichtet. Der Algorithmus berücksichtigt diese Wünsche.";

  const gridContainer = document.createElement("div");
  gridContainer.id = "availability-grid";

  container.append(intro, gridContainer);

  const availability = initSetAvailability({
    container: gridContainer,
    periods,
  });

  (container as any)._availability = availability;

  return container;
}

function validateStep1(): boolean {
  const ids = ["first-name-input", "last-name-input", "initials-input"];
  const invalid: HTMLInputElement[] = [];

  ids.forEach((id) => {
    const input = getElement<HTMLInputElement>(id);
    if (!input) return;
    const ok = input.value.trim().length > 0;
    input.setAttribute("aria-invalid", ok ? "false" : "true");
    if (!ok) invalid.push(input);
  });

  if (invalid.length > 0) {
    toast.error("Bitte Vorname, Nachname und Kürzel ausfüllen.");
    invalid[0]?.focus();
    return false;
  }
  return true;
}

async function openAddTeacherForm(existingTeacher?: Teacher): Promise<void> {
  const addTeacherScreen = aquireElement<HTMLElement>("add-teacher-screen");

  const isEditMode = !!existingTeacher;
  const [firstName, ...lastParts] = (existingTeacher?.teacherName ?? "").split(
    " ",
  );

  const state: TeacherFormState = {
    firstName: firstName ?? "",
    lastName: lastParts.join(" "),
    nameSymbol: existingTeacher?.nameSymbol ?? "",
    email: "",
    selectedSubjects: existingTeacher?.teachingSubject ?? [],
    nonWorkingHours: existingTeacher?.teacherNonWorkingHours ?? [],
    nonPreferredHours: existingTeacher?.teacherNonPreferredHours ?? [],
  };

  const frame = buildModal(addTeacherScreen, {
    title: isEditMode
      ? `${existingTeacher!.teacherName} bearbeiten`
      : "Neue Lehrkraft anlegen",
    size: "lg",
  });

  openModal(addTeacherScreen);

  let currentStep: TeacherFormStep = 1;
  let saving = false;

  function saveStep1(): void {
    state.firstName =
      getElement<HTMLInputElement>("first-name-input")?.value.trim() ?? "";
    state.lastName =
      getElement<HTMLInputElement>("last-name-input")?.value.trim() ?? "";
    state.nameSymbol =
      getElement<HTMLInputElement>("initials-input")?.value.trim() ?? "";
    state.email =
      getElement<HTMLInputElement>("email-input")?.value.trim() ?? "";
  }

  function saveStep2(stepContainer: HTMLElement): void {
    const selector = (stepContainer as any)._subjectSelector;
    if (selector) {
      state.selectedSubjects = selector.getSelectedSubjects();
    }
  }

  function saveStep3(stepContainer: HTMLElement): void {
    const availability = (stepContainer as any)._availability;
    if (availability) {
      state.nonWorkingHours = availability.getNonWorking();
      state.nonPreferredHours = availability.getNonPreferred();
    }
  }

  async function renderStep(): Promise<void> {
    frame.aside.replaceChildren(buildStepIndicator(currentStep));
    frame.setTitle(
      isEditMode
        ? `${existingTeacher!.teacherName} bearbeiten`
        : "Neue Lehrkraft anlegen",
      `Schritt ${currentStep} von 3 · ${STEP_TITLES[currentStep]}`,
    );

    if (currentStep === 1) {
      const stepContent = buildStep1(state);

      const nav = buildNavigationButtons({
        showBack: false,
        nextLabel: "Weiter",
        onNext: () => {
          if (!validateStep1()) return;
          saveStep1();
          currentStep = 2;
          void renderStep();
        },
      });

      frame.body.replaceChildren(stepContent);
      frame.footer.replaceChildren(...nav);
      imagePreview();
      getElement<HTMLInputElement>("first-name-input")?.focus();
    } else if (currentStep === 2) {
      frame.body.replaceChildren(buildLoadingHint("Fächer werden geladen …"));
      const stepContent = await buildStep2(state);

      const nav = buildNavigationButtons({
        showBack: true,
        nextLabel: "Weiter",
        onBack: () => {
          saveStep2(stepContent);
          currentStep = 1;
          void renderStep();
        },
        onNext: () => {
          saveStep2(stepContent);
          currentStep = 3;
          void renderStep();
        },
      });

      frame.body.replaceChildren(stepContent);
      frame.footer.replaceChildren(...nav);
      getElement<HTMLInputElement>("subject-input")?.focus();
    } else if (currentStep === 3) {
      const stepContent = buildStep3(state);

      const availability = (stepContent as any)._availability;
      if (availability) {
        availability.restore(state.nonWorkingHours, state.nonPreferredHours);
      }

      const nav = buildNavigationButtons({
        showBack: true,
        nextLabel: isEditMode ? "Speichern" : "Lehrkraft anlegen",
        nextIcon: "ti ti-check",
        onBack: () => {
          saveStep3(stepContent);
          currentStep = 2;
          void renderStep();
        },
        onNext: async () => {
          if (saving) return;
          saveStep3(stepContent);
          saving = true;

          const submit = getElement<HTMLButtonElement>("submit-teacher-btn");
          submit?.classList.add("btn--loading");

          try {
            const teacherData = collectTeacherData(state);

            if (isEditMode && existingTeacher) {
              await updateTeacher(existingTeacher.id, teacherData);
              toast.success(`${teacherData.teacherName} wurde aktualisiert.`);
            } else {
              await createTeacher(teacherData);
              toast.success(`${teacherData.teacherName} wurde angelegt.`);
            }

            closeModal(addTeacherScreen);
            await loadAndRenderTeachers();
          } catch (error) {
            console.error(error);
          } finally {
            saving = false;
            submit?.classList.remove("btn--loading");
          }
        },
      });

      frame.body.replaceChildren(stepContent);
      frame.footer.replaceChildren(...nav);
    }
  }

  await renderStep();
}

function buildLoadingHint(text: string): HTMLElement {
  const hint = document.createElement("p");
  hint.className = "form-intro text-muted";
  hint.textContent = text;
  return hint;
}

// ------------------------------------------------------------------- init

function initializeApp() {
  initNavbar();

  const noTeachersElement = getElement<HTMLElement>("no-teachers");
  if (noTeachersElement) {
    renderEmptyState(noTeachersElement, {
      illustration: "teachers",
      title: "Noch keine Lehrkräfte",
      hint: "Legen Sie Ihre erste Lehrkraft an oder importieren Sie Ihre Daten über das Dashboard.",
      ctaLabel: "Lehrer hinzufügen",
      onCta: () => void openAddTeacherForm(),
    });
  }

  const noResults = getElement<HTMLElement>("no-results");
  if (noResults) {
    renderEmptyState(noResults, {
      illustration: "search",
      title: "Keine Treffer",
      hint: "Kein Lehrer passt zu Ihrer Suche. Versuchen Sie einen anderen Namen oder ein Kürzel.",
      compact: true,
    });
    noResults.hidden = true;
    SEARCH.noResultsEl = noResults;
  }

  bindSearch(SEARCH);
  void loadAndRenderTeachers();

  const addBtn = getElement<HTMLElement>("add-btn");
  addBtn?.addEventListener("click", () => openAddTeacherForm());
}

document.addEventListener("DOMContentLoaded", initializeApp);
