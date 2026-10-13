---
name: HRMS aed
description: Internal HR management system for aed — precise, brand-restrained, employee-profile-centric
colors:
  primary: "#232BED"
  primary-ink-on: "#FFFFFF"
  brand-deep: "#0B2D4D"
  accent-vibrant: "#23FF55"
  accent-deep: "#014145"
  gradient-mid: "#20A7A1"
  gradient-end: "#22E76A"
  offwhite: "#F0ECE6"
  bg: "#F4F4FE"
  surface: "#F8F9FE"
  surface-sunken: "#EDEEFE"
  surface-hover: "#E2E3FD"
  surface-hover-strong: "#DADBFC"
  border: "#E7E8FD"
  border-strong: "#D3D5FB"
  ink: "#10151F"
  ink-secondary: "#162F49"
  ink-muted: "#2A425C"
  success-ink: "#014145"
  success-surface: "#DFF3EA"
  warning-ink: "#8A5A00"
  warning-surface: "#FFF3D6"
  danger-ink: "#9F2B25"
  danger-surface: "#FBE9E7"
  info-ink: "#232BED"
  info-surface: "#E8E9FD"
typography:
  display:
    fontFamily: "\"TT Firs Neue\", Inter, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.1rem + 0.8vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "\"TT Firs Neue\", Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "normal"
  title:
    fontFamily: "\"TT Firs Neue\", Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Raleway, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  data:
    fontFamily: "Raleway, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  label:
    fontFamily: "Raleway, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.03em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
motion:
  duration-fast: "120ms"
  duration-standard: "200ms"
  ease-standard: "cubic-bezier(0.22, 1, 0.36, 1)"
  scroll-easing-library: "lenis"
zIndex:
  dropdown: 100
  sticky: 200
  modal-backdrop: 300
  modal: 310
  toast: 400
  tooltip: 500
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink-on}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#1B21C4"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.sm}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-hover}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "9px 12px"
  badge-success:
    backgroundColor: "{colors.success-surface}"
    textColor: "{colors.success-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  badge-warning:
    backgroundColor: "{colors.warning-surface}"
    textColor: "{colors.warning-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  badge-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "3px 10px"
  info-tooltip-trigger:
    textColor: "{colors.ink-muted}"
    size: "14px"
  info-tooltip-trigger-hover:
    textColor: "{colors.primary}"
  info-tooltip-bubble:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.data}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    maxWidth: "220px"
---

# Design System: HRMS aed

## 1. Overview

**Creative North Star: "The Precise Ledger"**

HRMS aed is where a construction company keeps the truth about its people — contracts,
salaries, seguridad social, medical restrictions, disciplinary history. The system behaves
like a well-kept ledger, not a marketing surface: every screen is built to be scanned fast,
trusted completely, and never ambiguous. aed's own brand identity is bold, dynamic, and
vibrant (a signature green→blue gradient, electric blue, bright green) — this product wears
that identity as a **precise accent**, not as a wash across dense data screens. Color earns
its place; most of the interface is calm, cool-tinted neutral so that the two moments of real
color — a primary action, a status badge, the login/empty-state gradient — read as
deliberate, not decorative.

The product rejects two failure modes equally: the **outdated enterprise look** (dense gray
forms, unlabeled tables, generic icon sets — the SAP/Oracle-2000s trap) and the **generic
AI-SaaS look** (identical icon+text cards, gradient hero metrics, uppercase eyebrows on every
section, side-stripe accent borders). It is also not a consumer app — RR.HH. staff spend all
day here, and every employee will occasionally self-serve their own profile, so the interface
must flex between power-user density and lighter guided moments without changing its visual
language.

**Key Characteristics:**
- Cool, blue-tinted neutral canvas — never the warm cream/sand "AI default"
- aed's Azul Vibrante and Verde Vibrante appear only as precise accents, never as large fills
- Employee profile is the hub: sections, not scattered top-level CRUD screens, are the primary
  navigational metaphor — horizontal underline tabs for short sets, a sticky vertical nav once
  a detail view grows past what a tab row can hold (see "Section Navigation" in §5 Components)
- Flat-by-default surfaces with tonal layering for hierarchy; shadows reserved for floating
  elements only
- Responsive motion (clear feedback on hover/focus/load) without choreography — confidence
  through clarity, not spectacle
- Every independently-scrolling pane eases its scroll delta (Lenis) so long pages read as one
  continuous surface instead of snapping section by section — see the Fluid Scroll Rule in
  §4 Elevation
- Record-editing views (the employee profile) open read-only; a single global Editar control
  gates the whole page into edit mode at once — see View/Edit Mode in §5 Components

## 2. Colors

A cool, brand-tinted neutral system carries almost the entire interface; aed's vibrant palette
is rationed to actions, status, and identity moments.

### Primary
- **Azul Vibrante** (#232BED): the one color that means "act here." Primary buttons, links,
  focus rings, the active tab indicator. Nothing else on a screen should compete with it for
  attention.

### Secondary
- **Verde Vibrante** (#23FF55): reserved for small, high-signal moments only — a status dot,
  never body text (fails contrast) and never a large fill. This is the one place a badge is
  allowed to use the raw vibrant token directly instead of its desaturated `-ink`/`-surface`
  pair: the 6px status dot inside an "Activo"/"Vigente" badge (see Status Dot in §5 Components)
  is small enough that it reads as an accent, not a fill, so it stays exempt from the Rationed
  Brand Rule's "no raw accent as fill" spirit while still counting toward the ≤10% budget.
- **Azul Profundo** (#0B2D4D): the "signature" deep blue from the brand manual. Used for the
  logo lockup area and the active/selected state of primary navigation — a small, fixed
  surface, not a full sidebar wash.
- **Gradación aed** (`--gradient-aed` / `--gradient-aed-vertical`): the manual's signature 3-stop
  degradé — Azul Vibrante → a teal midpoint (#20A7A1, its own manual value) → a manual-defined
  green endpoint (#22E76A, close to but distinct from Verde Vibrante). Historically only existed
  "baked into" the aed logo asset; ported from HRMS aed (2026-09-17) as a real, usable token. Same
  Rationed Brand Rule as the other vibrant colors: a precise **line/accent**, never a fill. Two
  settled locations here: a top bar spanning the login screen (`.splitWrap::before`) and a
  bottom-edge line on the topbar (`.topbar::after`). The **sidebar** was tried twice on HRMS aed
  (a top-edge line, then a full background) and both were reverted on direct user feedback; it
  carries no gradient here either. Don't add a 4th location without confirming first.

### Tertiary
- **Verde Profundo** (#014145): doubles as the accessible ink color for success states
  (approved, active, completed) — dark enough to pass text contrast, and it's an official aed
  color, so "success" reads as on-brand rather than borrowed from a generic green.
- **Off-white aed** (`--color-offwhite`, #F0ECE6): a warm neutral from the brand manual, print-
  oriented (see "The No-Cream Rule" below). Defined so the token exists for a genuine print/
  document use if one comes up; tried once as a screen background on HRMS aed (a login form
  panel) and reverted the same day — real user feedback that it read as "yellowish" against the
  rest of a cool-toned interface. No screen location uses it here; don't reach for it without
  asking.

### Neutral
- **Bg** (`color-mix(in srgb, var(--color-primary) 5%, white)`, ≈ #F4F4FE): the app canvas —
  a near-white with a faint cool tint toward aed's own blue hue, one step lighter than Surface.
  Deliberately not warm.
- **Surface** (`color-mix(in srgb, var(--color-primary) 3%, white)`, ≈ #F8F9FE): panels, modals,
  table rows. Lighter than Bg on purpose — a card "pops" above the tinted canvas — but no longer
  a pure, isolated `#FFFFFF`: an earlier pass left Bg/Surface flat white while Sunken/Hover
  carried a strong tint, and the jump from "pure white card" straight to "clearly blue input"
  read as a hard edge rather than a gradient (see Named Rules below).
- **Surface Sunken** (`color-mix(in srgb, var(--color-primary) 8%, white)`, ≈ #EDEEFE): the
  *resting* structural fill — table headers, zebra striping, form-input backgrounds
  (`Field.module.css` `.control`), stat chips, sunken cards/boxes.
- **Surface Hover** (`color-mix(in srgb, var(--color-primary) 13%, white)`, ≈ #E2E3FD): the
  *interactive-feedback* fill — nav item hover/active, ghost/secondary button hover, dropdown
  item hover, table row hover. Noticeably more saturated than Surface Sunken on purpose, so a
  hover state reads as "this responds to you," distinct from a merely-structural sunken area.
  Never used for a resting/static background.
- **Surface Hover Strong** (`color-mix(in srgb, var(--color-primary) 17%, white)`, ≈ #DADBFC):
  one step past Surface Hover, used only for `.table tbody tr:nth-child(even):hover` — a row
  that was already zebra-striped (Surface Sunken at rest) darkens *further* on hover instead of
  resetting to the same Surface Hover a plain row would show.
- **Border** (`color-mix(in srgb, var(--color-primary) 11%, white)`, ≈ #E7E8FD) / **Border
  Strong** (`color-mix(in srgb, var(--color-primary) 20%, white)`, ≈ #D3D5FB): hairlines and
  dividers; Border Strong only for inputs and elements that need to read as
  interactive/editable.
- **Ink** (#10151F): primary text. **Ink Secondary** (`color-mix(in srgb, var(--color-brand-deep)
  65%, #2B3341)`, ≈ #162F49): de-emphasized but still-dense text (secondary table columns,
  table header labels, nav item text) — derived from Azul Profundo rather than a flat gray.
  **Ink Muted** (`color-mix(in srgb, var(--color-brand-deep) 58%, #545E70)`, ≈ #2A425C):
  captions, helper text, timestamps — darker than the neutral it replaced, so contrast only
  improved, still verified at ≥4.5:1 on both Bg and Surface; never a lighter "for elegance"
  gray.

### Named Rules
**The No-Cream Rule.** Off-white aed (#F0ECE6) is a warm print neutral from the brand manual —
right for business cards and letterhead, wrong for a dense working screen. It never appears as
the app's structural canvas. See Off-white aed under Tertiary above for its one tried-and-
reverted screen attempt.

**The Brand-Tinted Neutral Rule** (2026-09-10, explicit user request on HRMS aed — "muy gris,"
an audit found 5 gray-family tokens repeated across ~30 CSS Modules). Every structural neutral
(Bg/Surface, Surface Sunken/Hover/Hover Strong, Border/Border Strong, Ink Secondary/Muted) is a
`color-mix()` of a real brand color (Azul Vibrante for fills/borders, Azul Profundo for text)
rather than a flat gray hex — same "cool, blue-tinted neutral" principle the system already
had, just executed at a tint strength that actually reads as brand-tinted instead of plain
gray. **Went through five calibrations on HRMS aed** (ported here 2026-09-17). First attempt
used 8–22% mixes — visually indistinguishable from the flat gray it replaced. Second attempt
jumped to 18–38% on Sunken/Hover/Border but left Bg/Surface untouched at pure white — inputs/
tables read as sharply blue against a still-stark-white page, "un contraste muy fuerte." Third
pass gave Bg/Surface a light tint too (4%/2%) — too subtle to register, same mistake as the
first attempt on different tokens. Fourth pass landed on Bg/Surface 8%/5%, Sunken/Hover/Hover
Strong/Border/Border Strong at 12/20/26/18/30% — enough to read as tinted, but tinting **every**
large surface (canvas, cards, inputs) with the same hue at once, with no genuinely neutral area
anywhere, read as "everything is blue" even though no single value was extreme (a cumulative
effect, not a bad number). **Fifth pass** (current values above) scaled the whole thing down to
~60% of the fourth pass, same relative order, same single-gradient concept (Surface → Bg →
Sunken → Border → Hover → Hover Strong → Border Strong) — still a deliberate brand tint, not
flat gray (that was already tried and rejected), but no longer competing with the vibrant blue
of real actions. This does **not** relax the No-Cream Rule or the Rationed Brand Rule (these are
desaturated tints of a neutral surface, not the raw vibrant token used as a large solid fill —
the rule's own concern — so they don't count against the ≤10% budget). Two deliberate exceptions
stay flat gray, not brand-tinted: **Badge neutral variant** (a neutral badge exists specifically
to say "no special status" — tinting it blue would read as the existing Info badge) and
**disabled controls/icons** (`:disabled` text/backgrounds must read as "inert," not as a brand
moment).

**The Rationed Brand Rule.** Azul Vibrante and Verde Vibrante combined should never cover more
than roughly 10% of any given screen's surface area. Their scarcity is what makes them read as
"act here" / "this succeeded" instead of decoration. Two full-background experiments on HRMS aed
(the sidebar's entire background, the topbar's entire background, both using Gradación aed with a
scrim for text contrast) were built, shipped briefly, and reverted the same day on direct user
feedback — treat that as this rule already being tested against a real alternative and holding,
not as an option nobody's tried. Content-level color accents (a `3px solid var(--color-primary)`
left border on section headers, a `2px solid var(--color-primary)` bottom border on table
`<thead>`/`.table th` rows) are a different, smaller-scale kind of accent and are **not** covered
by that "reverted" history — those shipped and stayed.

## 3. Typography

**Display/Headline/Title Font:** "TT Firs Neue" (aed's brand typeface; license/font files
pending — Inter is the interim stand-in, matching its grotesque character closely enough that
swapping the file later needs no layout changes).
**Body/Label Font:** Raleway (Google Fonts, freely available now).

**Character:** A confident, slightly bold grotesque for anything that orients the user
(page titles, tab labels, section headers) paired with a humanist, highly legible sans for the
actual work — long forms, dense tables, body copy. The pairing mirrors the brand manual's own
intent (TT Firs Neue for headlines, Raleway for body) exactly.

### Hierarchy
- **Display** (600, clamp(1.375rem, 1.1rem + 0.8vw, 1.75rem), 1.2): large standalone numbers only
  (a KPI tile's big figure, e.g. `StatTile.jsx`'s `.statValue`) and a login screen's
  marketing-scale brand headline (its own clamp, only reuses the weight token). Not page
  titles (see Headline, below).
- **Headline** (600, 1.125rem, 1.3): page-level titles ("Perfil de Juan Pérez", "Empleados") AND
  section/tab-panel headers within a page (e.g. "Información Laboral") — same scale for both.
  Never a marketing-scale hero — this is a tool, not a landing page.
- **Title** (500, 1rem, 1.4): card headers, modal titles, table section headers.
- **Body** (400, 0.9375rem, 1.55): form field values, paragraph text, modal/dialog copy. Never
  smaller — WCAG floor for primary reading text. Max 75ch on any prose block (help text,
  descriptions).
- **Data** (400, 0.8125rem, 1.4): dense table cells only — the "secondary UI, metadata" rung,
  distinct from Body. Never used for form inputs or anything the user reads at length.
- **Label** (600, 0.75rem, letter-spacing 0.03em, uppercase): table column headers and form
  field labels only — a functional micro-label, not a decorative section eyebrow.

### Named Rules
**The Tabular Numerals Rule.** Any column of numbers (salarios, días, cédulas, valores) uses
`font-variant-numeric: tabular-nums` so digits align vertically. Non-negotiable for a payroll-
adjacent tool.

**Page title (`.title`): this CSS exact, not re-derived per project.** Incidente real
(2026-09-04): el HRMS aed tenía sus 12 títulos de página en la escala Display (`clamp(1.5rem,
1.2rem + 1vw, 2rem)`, hasta 32px) mientras que Contratación (ex-Solicitudes-Indirectos) ya usaba
Headline (1.25rem fijo, 20px) — el usuario prefirió el tamaño de Contratación y pidió
adoptarlo como la regla compartida. Cada página nueva usa este bloque completo para su `.title`
de nivel de página (`<h1>`), listo para copiar tal cual:

```css
.title {
  font-family: var(--font-display);
  font-size: var(--text-headline-size);
  font-weight: var(--text-headline-weight);
  margin: 0;
}
```

Sin `letter-spacing` ni `color` explícitos -- el `letter-spacing` de Display ya no aplica a esta
escala, y el color se hereda del `color` que `body` ya fija en `index.css` (ver la regla del
reset de `body`, más arriba en este documento) en vez de repetirse por página.

## 4. Elevation

Flat by default. Hierarchy between Bg → Surface → Surface Sunken is conveyed through the
neutral tonal ramp, not shadows — this keeps dense table/form screens calm. Shadows are used
sparingly and only for elements that are genuinely floating above the page flow.

### Shadow Vocabulary
- **Floating** (`box-shadow: 0 8px 24px rgba(16, 21, 31, 0.12)`): dropdowns, popovers,
  date pickers.
- **Modal** (`box-shadow: 0 16px 48px rgba(16, 21, 31, 0.18)`): dialogs, the multi-step
  employee creation wizard.
- **Toast** (`box-shadow: 0 6px 20px rgba(16, 21, 31, 0.15)`): transient notifications.

### Named Rules
**The Floating-Only Rule.** If it doesn't detach from the page's normal flow (a card, a table
row, a form section), it doesn't get a shadow. Depth is earned by z-index, not applied by
default.

### Motion & Scroll

Two speeds cover the whole product: `duration-fast` (120ms) for hover/focus/active-state
feedback on small elements (buttons, nav items, inputs), `duration-standard` (200ms) for
larger surface changes (modals, tab-panel swaps). Both always pair with `ease-standard`
(`cubic-bezier(0.22, 1, 0.36, 1)`, an ease-out-quart) — decisive on the way in, no bounce, no
elastic. Every transition declares both properties explicitly (`transition: background-color
120ms ease-standard, color 120ms ease-standard`); never a bare `transition: all`.

**The Fluid Scroll Rule.** Every independently-scrolling content pane (the main content area,
never the sidebar nav) is wrapped in Lenis (`lenis/react`'s `<ReactLenis root={false}>`) so
wheel/touch input eases into a continuous glide instead of the browser's default step-per-tick
feel — the thing that reads as a page scrolling "by section" rather than smoothly. `root={false}`
scopes Lenis to that one container: it still uses native `scrollTop`/`overflow-y: auto`
under the hood (not a transform-based virtual scroll), so `position: sticky` children — like
the profile's vertical section nav — keep working exactly as they would unsmoothed. Lenis
respects `prefers-reduced-motion` by default; never override that. The sidebar nav and any
`position: fixed` chrome are left outside the Lenis wrapper and keep native instant scroll.

## 5. Components

### Buttons
- **Shape:** 6px radius (`{rounded.sm}`) — precise, not soft, not sharp.
- **Primary:** Azul Vibrante fill, white text, 10px/20px padding. One primary action per view.
- **Hover / Focus:** primary darkens to #1B21C4 on hover; focus-visible gets a 2px Azul
  Vibrante ring offset 2px from the element, never a color-only change (keyboard users need
  the ring).
- **Secondary:** white surface, Ink text, Border-strong 1px outline. **Ghost:** no fill/border,
  Ink-secondary text, used for low-emphasis row actions (edit/delete icons in tables).

### Badges / Status Pills
- **Style:** full pill radius, semantic surface + ink pair (success/warning/danger/info from
  the token set), label typography. Used for `estado` (Activo/Inactivo/Vacaciones/...),
  contract status, incapacidad/permiso approval state.
- **Rule:** background is always the desaturated `-surface` token, never the `-ink` token as a
  fill with white text — keeps status color reserved for meaning, not decoration.
- **Status Dot:** for the one or two states that mean "this is the live, positive one" (an
  employee's `estado = ACTIVO`, a contract's `estado = Vigente`), the badge gets an optional
  leading 6px `border-radius: 50%` dot filled with the raw `accent-vibrant` (Verde Vibrante)
  token — not `success-ink`. It's the single spot in the product where the literal brand green
  shows up as a fill; keep it capped at that 6px dot, never grow it into a stripe or a larger
  chip.

### Tables
- **Style:** Surface background, Surface Sunken zebra striping on alternate rows, Border
  hairlines between rows only (no vertical column rules — reduces visual noise in wide
  employee tables). Header row uses Label typography on Surface Sunken; cells use Data
  typography (0.875rem) — never Body size, this is the one place text legitimately drops
  below 1rem, per the "secondary UI, metadata" rung of the type scale.
- **Row hover, two levels, not one.** A plain row hovers to Surface Hover; a row that's
  already zebra-striped (Surface Sunken at rest) hovers to the darker **Surface Hover Strong**
  instead (`.table tbody tr:nth-child(even):hover`, more specific than the plain
  `tr:hover` rule so it wins). Using the same Surface Hover for every row regardless of its
  resting shade made a zebra row look like it "reset" to a lighter tone on hover instead of
  darkening further — found as a real bug 2026-09-10 once the neutral tokens got bold enough
  for the flattening to be visible.
- **Density:** compact by default (row height ~40px) for RR.HH. list views; never nested
  cards inside a table cell.
- **Width:** list/table views always use the full content width of the page — the data is the
  point, so it gets the space; constrain width only for genuinely narrow content (a login
  form, a confirmation dialog), never for a data table.

### Row Icon Actions (mandatory on every table/list row — never text buttons)
Every row's Editar and Activar/Inactivar actions render as **icon buttons**
(`EditIconButton`/`ToggleActivoIconButton`, `components/ui/RowIconButtons.jsx`), never as text
buttons reading "Editar"/"Inactivar"/"Activar" — a pencil icon for Editar, a circle-with-line
(inactivar, turns danger-red on hover) or circle-with-cross (activar) for the toggle, both
32×32px in a right-aligned flex `.actionsCell`. One shared component, not copy-pasted SVG per
table — the gap this closes: a table that already had icons would hand-duplicate the same SVG
markup instead of importing a shared one, and a table built later would default back to plain
text buttons because nothing forced the icon convention. A **page-level** edit-mode toggle (the
big "Editar"/"Guardar"/"Cancelar" button pair at the top of a detail page) is a different pattern
(see View/Edit Mode below) and stays text — this rule is only for per-row actions inside a table
or list.

```jsx
<div className={styles.actionsCell}>
  <EditIconButton label={`Editar ${item.nombre}`} onClick={() => startEdit(item)} />
  <ToggleActivoIconButton
    activo={item.activo}
    labelActivar={`Activar ${item.nombre}`}
    labelInactivar={`Inactivar ${item.nombre}`}
    onClick={() => toggleActivo(item)}
  />
</div>
```

### Pagination (mandatory on every server-paginated list)

**Rule:** every server-paginated table uses `Pagination.jsx` (`components/ui/`) — same footer
bar, same two buttons, same wording in every project. Never a hand-rolled pager, never numbered
page buttons with ellipsis truncation. The component self-hides when there's nothing to paginate
(`total === 0` or a single page) — callers never need to remember that guard.

```jsx
<Pagination page={meta.page} pageSize={meta.pageSize} total={meta.total} onPageChange={setPage} />
```

| Element | Property | Value |
|---|---|---|
| Footer bar | layout | `justify-content: space-between`, `1px solid --color-border` top border, `--color-surface` background |
| Footer bar | padding | `8px` (`--space-sm`) top/bottom, `16px` (`--space-md`) left/right |
| Count text (`Mostrando X–Y de Z`) | type | `--text-data-size`, `--color-ink-muted` |
| Buttons | style | `Button variant="secondary"`, labels `‹ Anterior` / `Siguiente ›` — never bare glyphs alone, never "Prev/Next" |
| Page indicator (`Página X de Y`) | type | same as count text, sits between the two buttons |

### Fluid Width Rule (every view adapts to the viewport — no fixed widths)

**Rule:** no page, card, or section gets a hardcoded `max-width` that caps it below the available
viewport — a view must adapt to however wide the screen actually is, never assume a fixed width
and let content wrap/cut off around that assumption. This applies everywhere, not just the Tables
width guidance above.

The only legitimate `max-width` values are on content that's narrow **by nature**, not by
assumption about screen size: a search box, a filter dropdown, a tooltip bubble, the login
split-screen's text column, a single prose paragraph capped at 75ch for readability. If a
`max-width` is being added to a `.page`, `.card`, or any container that wraps a table or a `.row`
of form fields, that's the tell this rule is about to be violated — don't.

Content that's genuinely wider than any viewport (a table with many columns) scrolls
horizontally **inside its own container** (`overflow-x: auto` on the table wrapper) — it never
gets silently clipped, and it never forces the whole page to scroll sideways.

### Inputs / Fields
- **Style:** Surface Sunken background at rest, 1px Border, 6px radius.
- **Focus:** border shifts to Azul Vibrante + subtle 2px outer ring, no glow/blur effect.
- **Error:** border and helper text switch to `danger-ink`; the error message replaces the
  helper text, it never stacks below it.
- **Disabled:** Surface Sunken background, Ink-muted text, no border.

### Selección de uno a muchos (mandatory whenever a field assigns many items)

**Rule:** any field that assigns multiple items — a role's permission matrix, a multi-role
picker, users assigned to a record, approvers for a workflow step — uses one of two components,
never a bare `<select multiple>` (the native listbox's "Ctrl/Cmd+click to pick several" is not
discoverable, has no search, and gives no compact view of what's currently selected) and never a
long run-on paragraph of unstyled checkboxes wrapping by screen width (illegible past 4–5
options, no visual hierarchy).

- **`CheckboxGroup.jsx`** (`components/ui/`, pairs with `Checkbox.jsx`) — for a **short, fixed**
  set of independent boolean choices known ahead of time (a role's permission flags, a multi-role
  selector with a handful of roles). Renders as a `Surface Sunken` grid
  (`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`, never a single wrapping row),
  optionally with a `selectAllLabel` toggle for longer fixed lists. No search — search is
  friction a 5–15 item fixed list doesn't need.
- **`CheckboxListSelect.jsx`** (`components/ui/`) — for a **long and/or growing** list where
  search matters (assigning employees/users to a record, picking approvers from the whole
  company) and/or the options need grouping. Selected items render as removable pill chips above
  a bordered panel containing a search input, a live count, a "Limpiar" action, and the
  (optionally grouped) checkbox list itself (`max-height: 280px`, own scroll).

**Deciding which one:** if the option count is small and won't grow (a fixed enum of roles or
permissions), `CheckboxGroup`. If it's "pick from a list that could have dozens of rows and keeps
growing" (people, records), `CheckboxListSelect`. Never reach for a bare `<select multiple>` for
either case.

### Forms
- **Full-Width Rule:** forms take the full content width, not a narrow constrained centered
  column. Fields are organized into horizontal rows (`fieldSm`/`fieldMd`/`fieldLg` width
  classes inside a wrapping flex `.row`) so related fields sit side by side — a form is read
  left-to-right within a row, then top-to-bottom across rows, not as one long vertical stack.
- **Sectioned Rule:** related fields are grouped under a named section — a heading (Title
  typography) plus an optional one-line hint (Ink-muted, Data typography) — instead of one
  undifferentiated field list. Every multi-field form in the product uses this grouping so
  long forms stay scannable.
- **View/Edit Mode:** record-editing views render fields read-only by default. A single global
  **Editar** button — top-right of the page header, in line with the page title, outside the
  content card — switches the whole page into edit mode at once (swapping to **Cancelar** /
  **Guardar**). It is never repeated per section: implemented by wrapping each section's
  fields in a `<fieldset disabled>` driven by one shared boolean owned by the page layout, not
  by each section independently. Guardar submits via the native `form="…"` attribute pointing
  at whichever section's `<form>` is currently visible, so the header button never needs to
  reach into child state directly. Cancelar restores the last saved values. This mode only
  applies to editing an existing record; a linear creation wizard has no read-only state —
  fields are always editable there, since there's nothing saved yet to protect against
  accidental edits.

### Section Navigation (signature component — the record-detail hub)
Two variants of the same idea — "which slice of this record am I looking at" — chosen by how
many sections there are, not by developer preference:
- **Underline tabs (≤~8 sections):** horizontal row, Ink-secondary text at rest, Ink + 2px Azul
  Vibrante underline when active. Scrollable horizontally with a fade edge if it ever
  overflows; never wrapped to a second row.
- **Vertical section nav (>~8 sections):** a fixed-width (224px) sticky column to the left of
  the content card, one item per line, Surface Sunken background + Azul Vibrante text on the
  active item. Once a detail view crosses into the double digits, even a flat single list
  stops being scannable — group the sections into a small number of named, collapsible themes
  (an accordion, not N independent disclosures): only the group containing the active section
  is open, opening a different group's header closes whichever was open (never more than one
  expanded at once, and switching sections within the same group leaves it open rather than
  re-collapsing). The group header is a small-caps label (Label typography) with a trailing
  chevron that rotates 90° open, `duration-standard` + `ease-standard`, guarded under
  `prefers-reduced-motion`. A single scannable vertical list, sticky so it stays put while the
  content pane scrolls (compatible with the Fluid Scroll Rule in §4 — Lenis wraps the content
  pane only, never the nav), reads as one coherent index instead of N flat rows. Below ~900px
  the accordion groups stack in a plain column (no sticky, no horizontal scroll — an accordion
  has nowhere to unfold sideways in a narrow layout, same reasoning as the primary nav's
  flyout-to-inline fallback below).

### Info Tooltip
- **What it's for:** a KPI, chart, or any other compact/abstracted piece of data whose meaning
  isn't self-evident from its label alone (how it's calculated, what's included/excluded,
  what a bucket like "Sin asignar" means) — explained on demand instead of via permanent
  helper text that would clutter a dense dashboard.
- **Trigger:** a 14px circular "i" glyph (Ink Muted at rest, Azul Vibrante on hover/focus),
  placed immediately after the KPI/chart title, same line, `{spacing.xs}` gap. Never placed on
  its own row or floated away from the title it explains.
- **Behavior:** reveals on **both** hover and keyboard focus (`tabindex="0"` +
  `:focus-visible`) — a hover-only tooltip is invisible to keyboard users, which fails the
  product's WCAG AA commitment. The bubble is Ink background / Surface text, Data typography,
  `{rounded.sm}`, the Floating shadow (§4 Shadow Vocabulary — tooltips join dropdowns/popovers/
  date pickers in that list), `duration-fast` + `ease-standard` fade-and-rise-4px. Sits at
  `{zIndex.tooltip}` (500, the top of the z-index scale — a tooltip must never be occluded by
  a modal, toast, or sticky nav that happens to be open at the same time).
- **Accessibility wiring:** the trigger carries `aria-describedby` pointing at the bubble's
  `id`; the bubble carries `role="tooltip"`. Never implement this as a bare `title="…"`
  attribute (no styling control, inconsistent OS-level delay/appearance) or as `role="img"` on
  a wrapper around real content (hides the content from assistive tech).
- **Content:** one to two short sentences, plain language, states what's counted/excluded and
  the time window if one applies (e.g. "últimos 30 días", "mes actual"). Not a repeat of the
  title — it earns its place by adding the thing the title can't say in four words.

### Named Rules
**The Explain-on-Demand Rule.** A dense dashboard's KPIs and charts get their explanation via
Info Tooltip (§5), not via permanent caption text under every tile — permanent captions on
every single tile is the "identical card grids" AI-SaaS tell (§6 Don't) wearing a data-viz
costume. Reach for a permanent `chartHint`-style caption only when the context is genuinely
load-bearing for reading the chart correctly at a glance — the deeper "how is this computed"
explanation still goes in the tooltip either way.

### Primary Navigation (category rail + flyout)
For an app whose top-level nav has many categories/items (too many to list flat in a 260px
column), use a two-panel pattern instead of a single scrolling list:
- **Rail:** left sidebar, Surface background, one row per category (a `<button>`, not a link —
  categories don't navigate). Each row leads with a 16px hand-drawn glyph unique to that
  category instead of a number or bullet — `currentColor`, ~1.3px stroke, matching the Info
  Tooltip icon's convention, never a unicode/emoji stand-in. Ink-secondary text at rest,
  Surface Sunken background on hover. Azul Profundo fill + white text only on the category
  that contains the current route (see Rationed Brand Rule) — that fill persists regardless of
  what's hovered, so "where am I" never disappears just because the mouse moved. Raleway body
  typography, not Label — these are content, not micro-labels. Each row also carries a small
  right-pointing chevron at the trailing edge (same hand-drawn convention) that nudges 2px on
  hover as the only affordance beyond the flyout itself opening.
- **Flyout:** a floating panel (Floating shadow, `{rounded.md}`, `{zIndex.dropdown}`) anchored
  to the right edge of whichever category row is open — `position: absolute` so it never
  pushes the main content column, positioned per-row via CSS (`left: 100%` on the row itself,
  not computed in JS). Opens on hover **and** focus (same dual trigger as Info Tooltip) so
  keyboard users reach it — mouse close is debounced 300ms from `mouseleave` of the whole nav
  (cancelled the instant the pointer re-enters anywhere in the nav), so the gap between a row
  and its own flyout — an unavoidable side effect of anchoring via CSS instead of computing
  exact coordinates — doesn't close the panel out from under a slow diagonal mouse move; a
  real navigation click or focus leaving the nav's DOM subtree (`relatedTarget` check) closes
  immediately, no debounce. Never on blur into the flyout's own items. Items reachable today
  render as real `NavLink`s (`.navItem`/`.navItemActive`, same treatment as any other nav
  link); items planned but not built yet render as plain text plus a neutral "En desarrollo"
  Badge — same place in the tree, no click target (this is how a large roadmap stays visible
  in the IA without shipping dead links). Opens with a 200ms (`duration-standard`) fade + 4px
  slide, `ease-standard`, no reduced-motion override needed beyond disabling that one animation
  and the chevron nudge.
- **Mobile (<768px):** the flyout has nowhere to float in a single narrow column, so below
  768px it renders in-flow (`position: static`) directly under its category instead of
  overlapping — the whole sidebar stacks above the content with its own capped-height scroll.
  A tab-based detail view separately becomes a stepper/accordion rather than horizontal tabs
  below ~640px.

## 6. Do's and Don'ts

### Do:
- **Do** keep the app canvas cool-tinted neutral (#EDEEFE family) — never the warm cream/sand
  "AI default."
- **Do** reserve Azul Vibrante and Verde Vibrante for actions, status, and identity moments —
  the Rationed Brand Rule (≤10% of any screen).
- **Do** use underline tabs for short section sets and a sticky vertical section nav once a
  detail view outgrows what a tab row can hold (see Section Navigation, §5).
- **Do** use `tabular-nums` on every numeric table column.
- **Do** give every loading/empty/error state real, deliberate content — this product handles
  sensitive data, ambiguity erodes trust.
- **Do** let list/table views and forms use the full content width, organizing form fields
  into horizontal rows grouped by named section (see Forms, §5) — never a single narrow
  vertical field stack.
- **Do** gate an existing record's fields behind one global Editar/Guardar/Cancelar control in
  the page header (see View/Edit Mode, §5) — a creation wizard is the only place fields are
  always editable, since nothing is saved there yet.
- **Do** wrap every independently-scrolling content pane in Lenis so scrolling eases
  continuously instead of stepping section by section (see the Fluid Scroll Rule, §4) — but
  leave the sidebar nav and any fixed chrome on native scroll.
- **Do** explain a non-obvious KPI or chart with an Info Tooltip next to its title (§5,
  keyboard-reachable, `role="tooltip"`) instead of permanent caption text under every tile —
  the Explain-on-Demand Rule (§5).

### Don't:
- **Don't** replicate the SAP/Oracle-2000s look: dense gray forms with no hierarchy, generic
  icon sets, unlabeled cramped tables.
- **Don't** ship generic AI-SaaS scaffolding: identical icon+heading+text card grids, gradient
  hero metric tiles, uppercase eyebrows above every section, side-stripe colored borders on
  cards/alerts.
- **Don't** let the interface feel like a playful consumer app — no bouncy/elastic motion, no
  mascot-like illustration, no gratuitous color on data-dense screens.
- **Don't** use Off-white aed (#F0ECE6) as a screen background — it's a print-collateral color.
- **Don't** add a shadow to anything that isn't floating above the page (see Floating-Only
  Rule).
- **Don't** apply gradient-text (`background-clip: text`) anywhere — the aed gradient is a
  graphic accent element (per the brand manual), never a text treatment.
- **Don't** repeat an Editar/Guardar/Cancelar control inside every tab or section of a detail
  view — one global control per page, always.
- **Don't** grow the accent-vibrant status dot into a stripe, larger chip, or full badge fill —
  it stays a 6px indicator, the one deliberate exception to badges never using the raw accent
  token (see Status Dot, §5).
