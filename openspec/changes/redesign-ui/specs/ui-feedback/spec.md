## ADDED Requirements

### Requirement: Toast notifications
The UI SHALL provide `components/toast.ts` exporting `toast.success(message)`
and `toast.error(message)`. Toasts render into a single container with
`aria-live="polite"`, stack at most three, auto-dismiss after 4 s, and can be
dismissed by a close button.

#### Scenario: API failure surfaces
- **WHEN** a fetch in `apiHelpers.ts` fails
- **THEN** an error toast with a German message is shown in addition to the console log

#### Scenario: Stack limit
- **WHEN** four toasts are triggered within one second
- **THEN** only the three most recent are visible

### Requirement: Skeleton component
The UI SHALL provide `components/skeleton.ts` that renders `n` placeholder
rows or cards with a shimmer animation into a target element and a function to
clear them.

#### Scenario: Shimmer respects reduced motion
- **WHEN** reduced motion is requested
- **THEN** skeletons render without the shimmer animation

### Requirement: Empty-state component
`components/emptyState.ts` SHALL render an empty state from
`{ illustration, title, hint, ctaLabel?, onCta? }` and expose
`toggleEmptyState(element, hasItems)` for backwards compatibility.

#### Scenario: Without CTA
- **WHEN** an empty state is rendered without `ctaLabel`
- **THEN** no button is displayed
