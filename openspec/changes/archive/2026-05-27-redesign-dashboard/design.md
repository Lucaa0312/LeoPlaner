# Design

## Context

`Dashboard.md` is a design doc written for a React + Tailwind + lucide-react +
react-router implementation. The actual app is vanilla TypeScript that builds
DOM nodes imperatively, hand-written CSS with `--leo-*` custom properties, and
multi-page HTML navigated with `<a href>`. The work is a **translation of the
design intent**, not a port of the documented code.

## Decisions

### Translate, don't migrate
Keep the existing stack. Map documented constructs to local equivalents:

| Doc construct                         | Local equivalent                          |
|---------------------------------------|-------------------------------------------|
| React component / JSX                 | `createElement` builders in `dashboard.ts`|
| Tailwind utility classes              | CSS classes in `dashboard.css`            |
| `react-router` `<Link>`               | `<a href="*.html">`                       |
| `lucide-react` icons                  | Tabler (`ti ti-*`) / FontAwesome (loaded) |
| `bg-primary` `#2563eb`                | `--leo-primary-color1` `#4F46E5` (indigo) |
| `AppLayout`                           | existing `#nav-bar` + `#main-content`     |

### Palette: keep project indigo
The doc's blue (`#2563eb`) would change the global brand. Reuse existing
`--leo-*` variables so the dashboard matches the rest of the app.

### Klassen count: frontend, no new endpoint
There is no `getClassCount` endpoint; `SchoolClassResource` exposes
`getAllClasses` (a list). Derive the count client-side via
`fetchSchoolClasses().length`. Avoids a backend change for one number. Trade-off:
transfers the full list to count it — acceptable at expected class volumes.

### Drop "Algorithmus starten"
The algorithm is launched from the timetable page, and no `/algorithm` page
exists. Quick actions reduce from 4 to 3; the 2-column grid simply wraps.

### Reuse import/export, don't rebuild
`importButton.ts` (current branch) and `exportButton.ts` (merged from
`classSubjectPage`) already implement the logic. The dashboard only needs to
provide the elements they bind to (`#excel-upload` / `#excel-export` plus error
nodes) and call their `init*` functions. Export logic currently lives on the
timetable page; this change reuses the same feature module on the dashboard.

### Static header text
Replace the time-of-day greeting with the documented static title + subtitle,
matching `Dashboard.md`. Drops `generateWelcomeText`, `showLastUpdateTime`, and
the status card image.

## Dependency / sequencing

`classSubjectPage` must merge **before** implementation — it supplies the class
page, class API, export feature, and download API. Without it the Klassen card,
Klassen link, and export action cannot be wired.

## Risks

- Merge conflicts from `classSubjectPage` (touches web assets + backend).
- Icon-name mapping from lucide to Tabler/FontAwesome may not be 1:1; pick
  nearest visual equivalents.
- `fetchSchoolClasses` over-fetches for a count; revisit with a count endpoint
  only if class volume grows large.
