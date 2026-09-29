# Design PRD — Habit Tracker Web App

**Purpose:** This document specifies the visual design system, layout, components, and UX rules. Pair it with `architecture.md` (stack/flows) and `database.md` (schema). An AI coding agent should implement pixel-level and interaction-level decisions from this document rather than inventing its own defaults.

---

## 1. Design Principles

- **Calm, not gamified-loud.** This is a daily-use tool. Nothing should feel punishing or overly celebratory — the goal is a user who keeps opening the app, not one who feels judged by it.
- **No icon fonts, no stock icon packs.** Every icon is a custom-authored SVG. This keeps the visual language consistent and avoids the generic "template app" look.
- **Data-forward.** Graphs, tables, and heatmaps are first-class citizens, not decorative afterthoughts — the user is here to see their own patterns.
- **Vector everywhere.** No raster images/photos in the core UI. Illustrations, if any, are SVG.

---

## 2. Color System

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#2E7D6B` | Primary buttons, active nav item, links, chart primary series |
| `--color-accent` | `#F4A259` | Streak badges, highlights, secondary chart series, "success" moments |
| `--color-bg-light` | `#FAFAF7` | Light mode background |
| `--color-bg-dark` | `#121714` | Dark mode background |
| `--color-missed` | `#E0DED9` | Missed/incomplete state — deliberately neutral gray, never red |
| `--color-text-primary` | `#1C2620` | Body text (light mode) |
| `--color-text-secondary` | `#6B7A72` | Secondary/muted text, timestamps, helper text |
| `--color-danger` | `#C4554D` | Destructive actions only (delete habit, delete account) — the *only* place red-ish appears |
| `--color-border` | `#E4E2DC` (light) / `#232B26` (dark) | Card borders, dividers |

Dark mode: invert text tokens (`#F4F5F2` primary text, `#A8B3AC` secondary text on dark backgrounds), keep primary/accent hues the same but slightly desaturate/brighten if contrast against `#121714` is insufficient (verify WCAG AA — 4.5:1 minimum for body text).

---

## 3. Typography

- **Font:** A single geometric-humanist sans-serif (e.g., Inter, or a similar variable font) for both UI and Bengali text — confirm the chosen font has full Bengali glyph coverage, since the AI agent chat and any Bengali UI copy need to render correctly. If the primary font lacks Bengali support, pair it with a Bengali-supporting fallback (e.g., Noto Sans Bengali) explicitly in the font stack rather than relying on system fallback.
- **Scale:**
  - H1 (page titles): 28px / bold
  - H2 (section headers): 20px / semibold
  - Body: 15px / regular
  - Small/meta (dates, labels): 13px / regular
  - Numbers in stats (streak counts, percentages): tabular figures, semibold, slightly larger than surrounding text to draw the eye

---

## 4. Layout & Navigation

- **Structure:** Persistent left sidebar on desktop (≥1024px) containing the 5 nav items; collapses to a bottom tab bar on mobile/tablet (<1024px).
- **Nav items (fixed order):** Home, Dashboard, Add Habit, Track Habit, Settings.
- **Active state:** Primary-color left border (sidebar) or top border (bottom bar) + primary-color icon fill/stroke; inactive items use `--color-text-secondary`.
- **Max content width:** 1200px, centered, with responsive padding (16px mobile, 32px desktop).
- **Spacing scale:** 4/8/12/16/24/32/48px — no arbitrary values.

---

## 5. Icon System

- All icons are custom SVG, viewBox `0 0 24 24`, stroke-based (not filled), `stroke-width: 1.5`, `stroke-linecap: round`, `stroke-linejoin: round`.
- Icons use `currentColor` for stroke so they inherit text color and theme automatically (no separate light/dark icon assets needed).
- Required icon set for v1: home, dashboard/chart, add/plus, calendar/track, settings/gear, checkmark, streak/flame, edit/pencil, delete/trash, close/x, chevron (for calendar nav), export/download.
- Habit icon picker (Add Habit page): a curated set of ~20–30 category-relevant SVGs (water drop, book, dumbbell, moon/sleep, pen, code brackets, etc.) — store the SVG markup or a key referencing a static asset, per `database.md §2.2 icon_svg`.

---

## 6. Component Specs

### 6.1 Habit Checklist Item (Home)
- Left: color-tag dot (habit's `color`) + custom icon.
- Middle: habit name + today's target (if quantity-based, show "3/8 glasses" style progress text).
- Right: tap target — a circular checkbox for checkbox-type habits, or a stepper (+/-) for quantity-type habits.
- Completed state: checkbox fills with `--color-primary`, name text gets a subtle strikethrough-free "done" treatment (avoid strikethrough — it reads as "crossed off/failed" for some users; instead dim the row slightly and show a filled check).

### 6.2 Completion Ring (Home)
- Hand-drawn SVG: a background `<circle>` in `--color-missed`, an overlaid `<circle>` with `stroke-dasharray`/`stroke-dashoffset` animated to the day's completion percentage, in `--color-primary`.
- Center text: percentage, large, bold.

### 6.3 Streak Badge
- Small pill: flame icon (SVG) + number. Color intensity can scale slightly with streak length (e.g., accent color at 7+ days) but must stay within the palette — no arbitrary rainbow gradients.

### 6.4 Heatmap (Dashboard)
- Grid of `<rect>` cells, 7 columns (days of week) × N rows (weeks), GitHub-contributions style.
- Color scale: `--color-missed` (0%) → `--color-primary` at full opacity (100%), using opacity/lightness steps rather than introducing new hues.
- Tooltip on hover/tap: date + completion detail.

### 6.5 Charts (Dashboard)
- Bar chart (weekly): one bar per day, height = completion %.
- Line chart (monthly trend): rolling completion % over the month.
- Donut (per-habit success rate): two-segment donut, `--color-primary` for completed share, `--color-missed` for the rest — no legend needed if a center label shows the %.
- All chart text/gridlines use `--color-text-secondary` at low opacity; keep chrome minimal (no heavy borders, no drop shadows).

### 6.6 Calendar (Track Habit)
- Standard month grid, 7 columns.
- Day cell states: empty/future (muted, non-interactive), missed (outlined, `--color-missed` fill), completed (`--color-primary` fill, checkmark), today (accent-color ring around the cell regardless of completion state, so "today" is always identifiable).
- Tapping a day opens an inline popover/modal: toggle completion, add/edit note.

### 6.7 Forms (Add Habit, Settings, Auth)
- Inputs: 44px min height (touch target), 8px border radius, `--color-border` border, `--color-primary` border on focus (no default blue browser outline — replace with a visible custom focus ring for accessibility, don't just remove it).
- Buttons: primary (filled `--color-primary`, white text), secondary (outline), destructive (`--color-danger`, used only for delete actions with a confirmation step).
- Color picker: a fixed palette of ~10 preset swatches drawn from/extending the design system, not a full RGB picker — keeps user-created habits visually consistent with the rest of the app.

### 6.8 AI Agent Chat
- Docked panel or modal, not a full page — it's a helper, not a destination.
- User messages right-aligned in a `--color-primary`-tinted bubble; assistant messages left-aligned in a neutral card.
- Loading state while waiting for a response: a simple animated dot/pulse — avoid a generic spinner if possible, to keep visual consistency with the rest of the SVG-driven UI.
- Home page tip card: a compact, non-modal card (not the full chat UI) showing one short AI-generated line, with a "chat more" affordance that opens the full panel.

---

## 7. States & Feedback

- **Empty states:** Home with no habits yet → simple SVG illustration + "আপনার প্রথম হ্যাবিট যোগ করুন" (or English equivalent) + primary button to Add Habit.
- **Loading states:** skeleton blocks (rounded rectangles, `--color-missed` at low opacity, subtle pulse animation) — not spinners, for list/card content.
- **Error states:** inline, near the relevant field/action, in `--color-danger` text — never a blocking browser `alert()`.
- **Success feedback:** small toast (bottom or top-right), auto-dismiss ~3s, no sound.

---

## 8. Responsive Behavior

- **Breakpoints:** mobile <640px, tablet 640–1023px, desktop ≥1024px.
- Dashboard charts stack vertically on mobile instead of side-by-side.
- Calendar grid remains 7 columns at all sizes but cell size/padding shrinks on mobile.
- Bottom tab bar (mobile/tablet) uses icon + small label; sidebar (desktop) uses icon + full label, always visible.

---

## 9. Accessibility

- Color is never the only signal — completed/missed states pair color with an icon (check vs. empty), not color alone.
- All interactive elements reachable via keyboard (tab order follows visual order); focus states visible per §6.7.
- Minimum tap target 44×44px on touch devices.
- All SVG icons that convey meaning (not purely decorative) get an `aria-label` or adjacent visually-hidden text.
- Text contrast meets WCAG AA in both light and dark themes.

---

## 10. Language & Localization Notes

- UI copy should support both Bengali and English (the user works primarily in Bengali but is fluent with English content) — recommend building with a simple i18n key/value structure from the start (even if only one language ships in v1) rather than hardcoding strings, so adding the second language later doesn't require a rewrite.
- Numbers (streak counts, percentages) can remain in standard Arabic numerals regardless of UI language, unless the user specifies otherwise.
