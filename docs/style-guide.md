# Mosaic Creator style guide

How a step is laid out, where each kind of thing goes, and how it reads. The aim is for every step to work the same
way, so you learn the layout once. Before adding something to a step, find its zone below. If it fits no zone, the
step may be doing more than one job (see [One job per step](#one-job-per-step)).

## Step anatomy

Every step has the same four zones, always in the same places.

```
Desktop (900 px and wider)
┌──────────────────────────────────────────────────────────────────────────┐
│ App bar: logo · steps 1–6 · Project                                      │
├──────────────────────────────────────────────────────────────────────────┤
│ A  Step header (full width)                                              │
│    Title (the step's name)                                [Main action]  │
│    One-line purpose                                       [secondary]    │
├──────────────────────┬───────────────────────────────────────────────────┤
│ B  Settings          │ C  Result                                         │
│    (340 px column)   │    alerts about the result                        │
│                      │    facts (stats, colours used)                    │
│    Section           │    tools that act on the result (toolbar)         │
│    Section           │    status line                                    │
│    Section           │    ┌─────────────────────────────────────────┐    │
│                      │    │ stage: map, card, pages, table          │    │
│                      │    └─────────────────────────────────────────┘    │
└──────────────────────┴───────────────────────────────────────────────────┘

Phone (under 900 px): one column, in this order
┌──────────────────────┐
│ App bar, steps       │
│ A  Title             │
│    Purpose           │
│    [  Main action  ] │  full width
│ C  Result            │
│ B  Settings          │
└──────────────────────┘
```

### A. Step header

- **Title:** the step's name, exactly as on its tab (Image, Bricks, Touch up, Cards, Parts, Print). Not a
  description of the result ("Card map", "Card preview"). Use `h2`.
- **Purpose:** one sentence on what the step is for, starting from what you do: "Choose a picture and frame the part
  that becomes the mosaic." Keep it under 90 characters.
- **Main action:** at most one `contained` button. It goes top right on desktop, and full width under the purpose on a
  phone. It's the thing the step produces: *Use this image*, *Download BrickLink XML*, *Print cards*. A step that
  only sets things up (Bricks, Touch up, Cards) has no main action; you move on with the step tabs.
- **Secondary actions:** `outlined` buttons beside the main action, at most two (*Copy XML*).
- The header spans the full width, above the settings and the result, and stays in the same spot on every step.
- No settings in the header. A choice that changes the result belongs in the settings column, even if it's
  small (paper size, spares).

### B. Settings

- Everything that changes the result, and nothing else. It's always the left column on desktop and comes after the
  result on a phone.
- Settings are grouped in titled sections (`ControlSection`), in the order you'd decide them: Backing plate, then
  Brick, then Size, then Colours.
- Every setting is visible. Don't hide settings behind "More…" disclosures; if the column grows too long, the step is
  doing too much (see [One job per step](#one-job-per-step)).
- Help text goes directly under the control it explains, in `body2` and muted, one or two sentences.
- A step with no settings (Touch up) has no settings column, and the result takes the full width.

### C. Result

What the settings produce, shown as large as fits. From top to bottom:

1. **Alerts** about the result: warnings and errors, as an MUI `Alert`, full width of the result zone.
2. **Facts:** the stats row (`MosaicSummary`) and the colours used.
3. **Tools that act on the result**, such as the touch-up toolbar, directly above the stage they change.
4. **Status line:** one muted sentence saying what a click does now, or what just changed ("Click or drag on the map
   to make bricks Black. 3 bricks touched up.").
5. **Stage:** the map, card, printed pages or table, on the stud texture (`Stage`) or in a `Tray`.

### D. Empty states

When a step can't show a result yet, the stage holds one centred card: what to do, one main button, and a tip. Don't
repeat the card in a side panel.

## One job per step

A step does one job, named by its title. The signs it's doing two:

- its settings column needs scrolling past more than one screen on desktop
- it has tools for two different results (setting up the mosaic *and* editing single bricks)
- you'd describe its purpose with "and"

The fix is to split it into two steps, as Bricks and Touch up were split. Don't hide controls instead.

## Actions and buttons

| Kind | Style | Where | Example |
|---|---|---|---|
| Main action | `contained`, one per step | header, top right | Print cards |
| Secondary | `outlined` | beside the main action | Copy XML |
| In a section | `text` (small) | under the setting it acts on | Save palette |
| Tools | icon button + tooltip + `aria-label` | toolbar above the stage | Brush, Undo |
| Destructive | `text`, with confirmation or undo | in a section or a menu | Reset to defaults |

- An action is named by what happens ("Print cards", not "Submit"). It keeps the same name everywhere: the button,
  the status line and any message after it.
- Each action lives in one place only. Printing is on the Print step only.
- Toolbars follow a photo editor's layout: tools first, then fixed actions (clean-up, undo, redo, before/after,
  clear), then the current tool's options. Options appear only for the tools that use them. The fixed buttons never
  move.

## Text

- Write in sentence case. No all-caps labels.
- Keep it short, active and specific (the `stop-slop` skill): a subject and a verb, no filler, no "simply" or
  "just".
- Talk to the reader as "you". Name things as builders know them: *plate*, *brick*, *card*, *colour*, not *grid
  cell* or *palette entry*.
- Give numbers with their unit, and use × for sizes: 32 × 20 bricks, 256 mm, 8 × 8 plate.
- Colours always show their BrickLink id on a swatch, with the name beside it where there's room.
- A message after an action says what happened and what to do next: "Template saved: your settings, without an
  image."

## Visual

- **Colour:** the interface stays in baseplate greys with one azure accent, so the mosaic carries all the colour. Use
  the tokens in `src/theme.ts` (`plate`, `tray`, `groove`, `ink`, `muted`, `azure`, `azureWash`), never raw hex.
- **Type:** Rubik on a 1.25 scale. Step titles use `h2`, section titles `subtitle1`, body text `body1`, and help and
  status text `body2` in muted.
- **Surfaces:** white `Tray` for working areas and lists, `Stage` (stud texture) behind the result. Panels have no
  shadow.
- **Spacing:** MUI units of 8 px. Use 2 (16 px) between zones and between sections, and 1–1.5 inside a section.
- **Icons:** Material icons from `@mui/icons-material`, always with a tooltip and an `aria-label`.

## Phone

- Check every step at 390 px wide. Nothing may scroll sideways.
- The order is header, then result, then settings, and the main action is full width under the purpose.
- Tap targets are at least 40 px.
- A stage that takes drags (painting) scrolls the page in View mode and only captures touch while a tool is on.

## Checking a change

For every change to the interface:

1. Tests through the whole app (Testing Library), with coverage of 80% or more.
2. Playwright in Chrome at 1280 × 800 and 390 × 844: click through the change, take screenshots, and check that
   nothing scrolls sideways.
3. A `frontend-design` review of the step's layout, to keep it from getting busy.
4. Check the step against this guide: the four zones, one main action, and settings only in the settings column.

## Where the steps stand

What each step needs to match this guide. Work through these in #21.

| Step | Header | Settings | Main action | To change |
|---|---|---|---|---|
| Image | none | Frame, Adjust | bottom of settings | Add the header ("Image" + purpose); move *Use this image* to the header; keep the empty-state card. |
| Bricks | "Card map" | 4 sections | Print map | Title "Bricks"; header full width; remove *Print map* (printing is on Print only). |
| Touch up | ✓ | none (full-width result) | none | Toolbar icon buttons are about 30 px; make them 40 px on touch screens. |
| Cards | "Card preview" | 3 sections | none | Title "Cards"; header full width. |
| Parts | ✓ | Spares in the header | Download XML ✓ | Move Spares into a settings column. |
| Print | "Building cards" | Paper, Map page and batches in the header | Print cards ✓ | Title "Print"; move Paper, Map page and batches into a settings column. |

A shared `StepHeader` component (title, purpose, main and secondary actions) and a `Workspace` that places it full
width will hold the zones in code, so a new step can't drift.
