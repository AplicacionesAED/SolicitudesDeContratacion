---
name: Solicitudes Indirectos — Baia Kristal
description: Sistema de gestión de solicitudes de contratación indirecta para el proyecto Baia Kristal
colors:
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-tint: "#eff6ff"
  primary-active-text: "#1d4ed8"
  surface: "#ffffff"
  surface-muted: "#f9fafb"
  surface-hover: "#f3f4f6"
  border-default: "#e5e7eb"
  border-strong: "#d1d5db"
  ink-primary: "#111827"
  ink-secondary: "#4b5563"
  ink-muted: "#9ca3af"
  ink-label: "#374151"
  danger: "#dc2626"
  danger-hover: "#b91c1c"
  danger-tint: "#fef2f2"
  danger-text: "#b91c1c"
typography:
  headline:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "normal"
  body:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "Geist Sans, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
---

# Design System: Solicitudes Indirectos — Baia Kristal

## 1. Overview: El Expediente

**Creative North Star: "El Expediente"**

Every screen is a record. A contracting request is not a card or a form — it is a document with legal weight, an audit trail, and a chain of custody. The visual system reflects this: clear hierarchies, unambiguous labels, and a surface that communicates institutional permanence without formality for its own sake. Nothing is decorative. Everything that appears on screen does so because it carries information someone needs to act on.

The governing register is dense-and-scannable. Users open this app to advance work, not to explore. They land in the middle of a workflow and need to see where it stands, who is next, and what action is available to them. Emphasis is directional: state badges, primary actions, and workflow progress are always visible; secondary metadata recedes without disappearing.

This system explicitly rejects consumer SaaS aesthetics (playful type, outsized whitespace, delight as a primary value) and the generic internal-tool look (navy headers, pill buttons, off-the-shelf Bootstrap feel). The goal is earned familiarity — the interface disappears into the task, and users navigate it fluently from day one because it follows conventions they already know, executed with more care than they expect.

**Key Characteristics:**
- Flat surfaces with structural borders, not shadows
- Geist Sans at consistent sizes — no display type, no scale drama
- Blue-600 accent reserved for primary actions and active states only
- Mobile-first layout: critical workflow paths completable on 320px
- State legibility above all: a solicitud's estado must be unmistakable at a glance

## 2. Colors: La Paleta del Expediente

A restrained palette anchored by a single engineering-grade blue and a gray scale that reads as institutional, not sterile.

### Primary
- **Azul Ingeniería** (`#2563eb`): The primary action color. Used exclusively on primary buttons, navigation active state backgrounds, focus rings, and interactive state indicators. Its rarity signals importance — it should not appear for decoration.
- **Azul Ingeniería Profundo** (`#1d4ed8`): Hover state for primary blue elements. Also used for active nav item text.
- **Azul Tinta** (`#eff6ff`): Low-saturation tint of the primary. Used as the active nav item background and as success-adjacent highlights.

### Neutral
- **Blanco Superficie** (`#ffffff`): Cards, sidebar, header bar, input backgrounds. The primary content surface.
- **Gris Documento** (`#f9fafb`): Main page background. Distinguishes the content area from its containers.
- **Gris Hover** (`#f3f4f6`): Hover state for list items, nav links, and ghost buttons.
- **Borde Suave** (`#e5e7eb`): Default borders. Cards, sidebar, header, dividers, table rows.
- **Borde Fuerte** (`#d1d5db`): Input and form control borders at rest.
- **Tinta Principal** (`#111827`): All headings and high-priority data (numbers, names, estados).
- **Tinta Secundaria** (`#4b5563`): Body text, nav items at rest, supporting copy.
- **Tinta Etiqueta** (`#374151`): Form labels, field group headers.
- **Tinta Atenuada** (`#9ca3af`): Placeholder text, muted metadata, icon defaults.

### Semantic (error/danger)
- **Rojo Error** (`#dc2626`): Danger button backgrounds, destructive action text.
- **Rojo Error Hover** (`#b91c1c`): Hover for danger actions.
- **Rojo Tinta** (`#fef2f2`): Error alert backgrounds and danger input focus tints.

### Named Rules

**The Azul Ingeniería Rule.** Blue-600 (`#2563eb`) appears on at most two elements per screen at any time: the primary action button and the active navigation item. It must not appear in decorative contexts (icon fills at rest, card borders, section headings). Its rarity is the signal.

**The No Warm Neutral Rule.** The background is `#f9fafb`, not a sand, cream, or tinted warm. Warmth in this system comes from accurate status colors and purposeful density, not from background tint.

## 3. Typography: Geist Sans — Precisión Funcional

**Primary Font:** Geist Sans (with `system-ui`, `sans-serif` fallback)
**Monospace:** Geist Mono (used for code values, reference numbers, and consecutivo strings)

**Character:** A single-family system. Geist Sans carries every role — from page headings to table data — using weight and size contrast rather than pairing drama. The result is visual unity without monotony: the eye reads hierarchy through mass, not through typeface conflict.

### Hierarchy
- **Headline** (700, 1.5rem / 24px, line-height 1.25): Page titles, modal headings. Used once per screen.
- **Title** (600, 1rem / 16px, line-height 1.5): Card titles, section headers, dialog titles.
- **Body** (400, 0.875rem / 14px, line-height 1.5): All body copy, form helper text, timeline descriptions. Max line length 65–75ch for prose blocks.
- **Label** (500, 0.875rem / 14px, line-height 1.4): Form labels, button text, nav item text, badge copy. Medium weight distinguishes interactive from descriptive.
- **Caption** (400, 0.75rem / 12px, line-height 1.4): Timestamps, muted metadata, sub-labels. Never use for primary information.

### Named Rules

**The Single Family Rule.** Geist Sans is the only typeface. Do not introduce a display font, a serif accent, or an extra sans. Hierarchy is expressed through weight (400 / 500 / 600 / 700) and size, not through competing families.

**The No Uppercase Body Rule.** Uppercase text is prohibited in body copy and form labels. It is permitted only in badge/chip labels four words or fewer. Status labels (`ENVIADA`, `COMPLETADA`) use the system's native uppercase token only.

## 4. Elevation: Plano por Defecto

This system is flat by default. Depth is communicated through surface color contrast (white card on `#f9fafb` background) and structural borders, not through shadows.

### Shadow Vocabulary
- **Ambient Mínimo** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Used only on the login card and full-page overlays. Signals modal-level separation, not card decoration.
- **Dropdown** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): Used on popovers and dropdown menus only. Never on cards or inline containers.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow on a card communicates interactive context (hoverable, draggable) that cards in this system do not have. Use border + background color contrast instead. Shadows appear only on elements that float above the page (dropdowns, modals).

## 5. Components: Estructurado y Eficiente

Every component has complete state coverage: default, hover, focus, active, disabled, loading. No half-states shipped.

### Buttons

- **Shape:** Gently rounded (6px radius, `rounded-md`)
- **Primary:** Azul Ingeniería background (`#2563eb`), white text, h-9 (36px), 14px label-weight text, 16px horizontal padding. Hover: `#1d4ed8`. Focus: 2px ring in `#2563eb` with 1px offset. Disabled: 60% opacity.
- **Secondary:** White background, Borde Fuerte border (`#d1d5db`), Tinta Etiqueta text (`#374151`). Hover: `#f9fafb` background.
- **Danger:** Rojo Error background (`#dc2626`), white text. Hover: `#b91c1c`.
- **Ghost:** Transparent background, no border, Tinta Secundaria text. Hover: Gris Hover fill (`#f3f4f6`).
- **Loading state:** Spinner replaces or prepends the label. Button stays same size; no layout shift.

### Cards / Containers

- **Corner style:** Comfortably rounded (12px radius, `rounded-xl`)
- **Background:** Blanco Superficie (`#ffffff`)
- **Shadow:** None. Border only.
- **Border:** Borde Suave (`#e5e7eb`), 1px
- **Internal padding:** `20px` (`p-5`) for content cards; `24px` (`p-6`) for full-page sections
- **Hover (when linked):** Border shifts to `#bfdbfe` (blue-200) on hover via `transition-colors`

### Inputs / Fields

- **Style:** White background, Borde Fuerte border (`#d1d5db`), 8px radius (`rounded-lg`)
- **Padding:** `10px 12px`
- **Font:** 14px body
- **Placeholder:** Tinta Atenuada (`#9ca3af`)
- **Focus:** 2px ring in `#2563eb`, border shifts to `#2563eb`. No background color change.
- **Hover:** Border shifts to `#9ca3af`
- **Error:** Border `#dc2626`, 2px ring in `#dc2626`
- **Disabled:** Background `#f9fafb`, text `#9ca3af`, cursor not-allowed

### Estado Badges (Workflow States)

The most important component in the system. Each estado badge is a pill (rounded-full) with a colored background tint and matching text color. States must be immediately distinguishable without relying on color alone (pairing color with a short uppercase label).

- **BORRADOR:** Gray background (`#f3f4f6`), gray text (`#374151`)
- **ENVIADA:** Blue tint (`#dbeafe`), blue text (`#1d4ed8`)
- **EN_TRAMITE_CONTRATOS:** Indigo tint, indigo text
- **EN_CONTROLES:** Purple tint, purple text
- **APROBACION_FINAL:** Amber tint, amber text
- **COMPLETADA:** Green tint (`#dcfce7`), green text (`#15803d`)
- **DEVUELTA / EN_REVISION:** Red tint (`#fee2e2`), red text (`#b91c1c`)

### Navigation (Sidebar)

- **Container:** White background, Borde Suave right border, 240px wide / 64px collapsed
- **Nav item default:** Tinta Secundaria text (`#4b5563`), gray icon (`#9ca3af`), px-3 py-2.5, rounded-lg (8px)
- **Nav item hover:** Gris Hover fill (`#f3f4f6`), Tinta Principal text (`#111827`), icon darkens to `#4b5563`
- **Nav item active:** Azul Tinta fill (`#eff6ff`), Azul Ingeniería Profundo text (`#1d4ed8`), Azul Ingeniería icon (`#2563eb`)
- **Logo mark:** 32×32px, Azul Ingeniería fill, 8px radius, white "BK" text (700 weight, 12px)
- **Collapsed state:** 64px wide, icons only, tooltips on hover

### Notifications Bell

- **Default:** Ghost button size, gray icon, no background
- **With unread:** Red dot badge (8px, `#dc2626`) in top-right corner of icon area. No numbers — presence only.

## 6. Do's and Don'ts

### Do:
- **Do** reserve Azul Ingeniería (`#2563eb`) for primary actions and active nav states only. One or two elements per screen maximum.
- **Do** use estado badges as the primary status signal. Pair color with a short uppercase label so color-blind users get the same information.
- **Do** keep cards flat: white background + `#e5e7eb` border, no shadow. A shadow means "this floats above the page" — cards don't.
- **Do** use 14px label-weight (500) for all button text, form labels, and nav items. Weight distinguishes interactive from descriptive copy at the same size.
- **Do** size tap targets at 44px minimum height for mobile. `h-9` (36px) buttons must receive a padding wrapper for touch contexts.
- **Do** complete all interactive states: default, hover, focus, active, disabled, loading. A component without focus styles ships broken for keyboard users.
- **Do** use Gris Documento (`#f9fafb`) as the page background and Blanco Superficie (`#ffffff`) for all content containers. Never invert this.
- **Do** prefer structural actions (inline forms, progressive disclosure) over modals. Modals are permitted for destructive confirmation only.

### Don't:
- **Don't** introduce a second typeface. Geist Sans is the only typeface in this system. Not a serif accent, not an extra geometric sans, not a display font for headings.
- **Don't** use the consumer SaaS aesthetic: large empty whitespace, oversized hero typography, playful illustration, personality-first copy. This is a serious workflow tool.
- **Don't** use a warm, cream, or sand background (`oklch(L 0.84-0.97, C < 0.06, hue 40-100)`). The background is `#f9fafb`, chroma 0.
- **Don't** use the generic Bootstrap / Material visual language: navy headers, pill badges on every label, off-the-shelf card grids with icon + heading + text repeated identically.
- **Don't** apply a shadow to an inline card or list item. Shadows are reserved for elements that float above the document layer (dropdowns, modals).
- **Don't** use all-uppercase body copy or form labels. Uppercase is permitted only for short badge labels (≤4 words).
- **Don't** use gradient text (`background-clip: text` + gradient). Estado colors are solid; accents are solid.
- **Don't** put a colored left border (border-left > 1px) on cards, list items, or alerts. Use background tint + full border or nothing.
- **Don't** gate primary workflow actions behind two clicks when one click is possible. Density is a virtue; navigation friction is not.
