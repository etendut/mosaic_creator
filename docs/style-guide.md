# Mosaic Creator style guide

How a step is laid out, where each kind of thing goes, and how it reads. The aim is for every step to work the same
way, so you learn the layout once. Before adding something to a step, find its zone below. If it fits no zone, the
step may be doing more than one job (see [One job per step](#one-job-per-step)).

## Step anatomy

Every step is laid out like a photo editor, with three zones that never move:

- **Top:** the app bar, holding the menu, the steps and the main action.
- **Middle:** the canvas, where the result is shown as large as it fits.
- **Tools:** the settings and tools that change the canvas. They sit along the bottom on a phone and become the left
  column on desktop.

```
Phone (under 900 px)                    Desktop (900 px and wider)
┌────────────────────────────┐          ┌──────────────────────────────────────────────────────────┐
│ ☰  Bricks          [Action]│ app bar  │ ☰  ①Image ②Bricks ③Touch up ④Cards ⑤Parts ⑥Print [Action]│
│ ①Image ②Bricks ③Touch… ›   │          ├──────────────────┬───────────────────────────────────────┤
├────────────────────────────┤          │ Tools            │ status line                           │
│ status line                │          │ ┌──────────────┐ │ facts (stats, colours used)           │
│ ┌────────────────────────┐ │          │ │ Plate        │ │ ┌───────────────────────────────────┐ │
│ │                        │ │          │ ├──────────────┤ │ │                                   │ │
│ │        canvas          │ │ canvas   │ │ Brick        │ │ │             canvas                │ │
│ │     (full width)       │ │          │ ├──────────────┤ │ │                                   │ │
│ │                        │ │          │ │ Size         │ │ │                                   │ │
│ └────────────────────────┘ │          │ ├──────────────┤ │ └───────────────────────────────────┘ │
│ ┌────────────────────────┐ │          │ │ Colours      │ │                                       │
│ │ open tool's settings   │ │ panel    │ └──────────────┘ │                                       │
│ └────────────────────────┘ │          │ (all groups open)│                                       │
│ [Plate][Brick][Size][Col.] │ tool bar └──────────────────┴───────────────────────────────────────┘
└────────────────────────────┘
```

### Top: app bar

- **☰ menu** at the left: the project actions (open, save, template, reset, forget image) and About.
- **Step tabs** next to it on desktop. On a phone they take the bar's second row and scroll sideways; the first row
  shows ☰, the current step's name and the main action.
- **Main action** at the right: at most one `contained` button, for the thing the step produces, like a photo
  editor's Export or Done. Examples: *Use this image*, *Download BrickLink XML*. A step that only sets things up
  (Bricks, Touch up, Cards) has no main action; you move on with the step tabs. An action that follows from the tool
  settings goes at the end of the tools instead (see [Tools](#tools)), as *Print cards* does.
- **Secondary action** (at most one, `outlined`): beside the main action on desktop, and in ☰ on a phone (*Copy
  XML*).
- There's no separate title on the page. The highlighted tab names the step, and the status line says what it's for.

### Middle: canvas

The result of the step, as large as fits: the photo, map, card, printed pages or the parts table. From top to bottom:

1. **Alerts** about the result: warnings and errors, as an MUI `Alert`.
2. **Status line:** one muted sentence, under 90 characters, saying what the step is for ("Your picture in bricks. Each
   square is one card, built on one plate."), what a click does now ("Click or drag on the map to make bricks
   Black."), or briefly what just happened ("Cleaned up 7 bricks."). No counts or sizes: those go in Info.
3. **Facts that are also tools**, such as the colours used on Bricks (tap one to swap it). Plain numbers go in Info.
4. **Canvas:** in a `Stage` (on the page's studs) or a `Tray`. Full width on a phone, with only the 8 px gutter.

### Tools

Everything that changes the canvas. Nothing else goes here, and nothing that changes the canvas goes anywhere else
(not the app bar, not above the canvas).

- **Groups:** tools come in groups, in the order you'd decide them, for example Plate, Brick, Size, Colours. Each group
  has a short name and an icon.
- **On a phone:** a bar along the bottom with one icon and label per group. Tapping a group opens its settings in a
  panel just above the bar, at most 45% of the screen high, with the canvas still in view. Tapping the group again, or
  the canvas, closes it. One panel is open at a time.
- **On desktop:** the same groups as the left column (340 px), all open, each as a titled `ControlSection`.
- **Every setting in an open group is visible.** Don't hide settings behind "More…" disclosures. If a group grows too
  long, the step is doing too much (see [One job per step](#one-job-per-step)).
- **Help text** goes directly under the control it explains, in `body2` and muted, one or two sentences.
- **Info** is the step's information: counts, sizes, pages, totals ("Parts 11,988 · Lots 9 · Spares none"). It's the
  last group of the tools: the end of the column on desktop, and an ⓘ button at the end of the phone bar that opens it
  as a panel. Labels on the left, values on the right.
- **Show choices, don't hide them.** A choice of up to about six options is a plain list (radio buttons) or a row of
  toggle buttons, so every option is in view: Paper (A4, Letter, A3), what to print. Not a dropdown.
- **An action that follows from the tools** (*Print cards*, after Paper and Pages) ends the tools, with a line above
  it saying what it will do ("12 cards on 2 pages, 8 per A4 landscape page, after a map page.") and any note about
  it. On desktop it's the last block of the column, and on a phone a strip just above the tool bar, so it's one tap
  away. It's the step's main action, so the app bar has none.
- **Steps that edit the canvas directly** (Touch up) put all their tools in one set, in the same order on both
  layouts, with dividers between: history (undo, redo, before/after), the tools (brush, eraser, eyedropper), the brush
  palette (colour ▾, size, shape; always in view), clean-up (one icon button per strength), and clear all. On desktop
  it's one Tools section in the column; on a phone the palette is a strip above an icons-only bottom bar, with the
  names read out. A tool is on from the start, so there's no View tool.
- **A canvas you edit zooms and scrolls**, like a document or photo viewer: it fills the space to the bottom of the
  window (or the phone's tools) in a scrolling box, fitted at 100%; zoomed in, it's bigger than the box, with scroll
  bars. Ctrl + wheel or a trackpad pinch zooms around the pointer, and a plain wheel scrolls; pinch and two-finger drag
  on touch screens; Space or middle-button drags scroll; and a small zoom control sits in the corner (− · % · + ·
  fit). The canvas redraws sharper as it zooms. One finger still paints: it waits until it moves or lifts, so a pinch
  never paints.

### Empty states

When a step can't show a result yet, the canvas holds one centred card: what to do, one main button, and a tip. The
tools zone stays empty until there's something to change.

## One job per step

A step does one job, named by its tab. The signs it's doing two:

- its tools need more than one screen on desktop, or more than five groups in the bottom bar
- it has tools for two different results (setting up the mosaic *and* editing single bricks)
- you'd describe its purpose with "and"

The fix is to split it into two steps, as Bricks and Touch up were split. Don't hide controls instead.

## Actions and buttons

| Kind | Style | Where | Example |
|---|---|---|---|
| Main action | `contained`, one per step | app bar, right, or the end of the tools when it follows from them | Download BrickLink XML, Print cards |
| Secondary | `outlined` | beside the main action (desktop), ☰ (phone) | Copy XML |
| In a group | `text` (small) | under the setting it acts on | Save palette |
| Tools | icon + label (bar) or icon + tooltip (rail), with an `aria-label` | tools zone | Brush, Undo |
| Project and app | menu items | ☰ menu | Save project, About |
| Destructive | `text`, with confirmation or undo | in a group or ☰ | Reset to defaults |

- An action is named by what happens ("Print cards", not "Submit"). It keeps the same name everywhere: the button,
  the status line and any message after it.
- Each action lives in one place only. Printing is on the Print step only.
- Editing tools follow a photo editor's layout: everything in the tools zone, in one order on both layouts (history,
  tools, palette, clean-up, clear all), as icon buttons with tooltips. The buttons never move.

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
- **Type:** Rubik on a 1.25 scale. Group titles use `subtitle1`, body text `body1`, and help and status text `body2`
  in muted.
- **Surfaces:** every page sits on the stud texture (`studTexture`, on the page body), like a baseplate. White
  `Tray` for working areas, panels and lists. `Stage` holds the canvas with no background of its own, so the studs run
  through it unbroken. Panels have no shadow, except the phone tool panel, which sits over the canvas. Print is plain
  white.
- **Spacing:** MUI units of 8 px. Use 2 (16 px) between zones and groups, and 1–1.5 inside a group.
- **Icons:** Material icons from `@mui/icons-material`, always with a label or tooltip and an `aria-label`.

## Phone

- Check every step at 390 px wide. Nothing may scroll sideways.
- From top to bottom: the app bar, then the status line and canvas, then the facts, with the tool bar along the
  bottom. The facts go under the canvas on a phone, so the canvas stays in view above an open tool panel.
- The tool bar stays at the bottom of the screen, and the canvas fills the space between the bars.
- Tap targets are at least 40 px.
- A canvas that takes drags (painting) scrolls the page in View mode and only captures touch while a tool is on.

## Checking a change

For every change to the interface:

1. Tests through the whole app (Testing Library), with coverage of 80% or more.
2. Playwright in Chrome at 1280 × 800 and 390 × 844: click through the change, take screenshots, and check that
   nothing scrolls sideways.
3. A `frontend-design` review of the step's layout, to keep it from getting busy.
4. Check the step against this guide: the three zones, at most one main action (in the app bar), and settings only in
   the tools zone.

## Where the steps stand

What each step needs to match this guide. Work through these in #21.

**Every step:** the app bar gets ☰ (in place of *Project*) and the main action, and on a phone the step's name. Page
headings ("Card map", "Card preview", "Building cards", "Parts", "Touch up") go, and their text becomes the status
line. On a phone, tool groups move from below the canvas into the bottom bar and panel.

| Step | Main action (app bar) | Tool groups | Also |
|---|---|---|---|
| Image | Use this image | Frame, Adjust | The empty-state card stays. |
| Bricks | none (*Print map* goes; printing is on Print only) | Plate, Brick, Size, Colours | |
| Touch up | none | One Tools set: history, tools, palette, clean-up, clear all | Done: one order on both layouts, icons-only bar on phones, palette always in view, 40 px tap targets. |
| Cards | none | Size, Text, Colour | |
| Parts | Download BrickLink XML | Spares | Spares moves out of the page header into the tools zone. *Copy XML* is the secondary action. |
| Print | none in the app bar; *Print cards* ends the tools, with its summary above it | Paper, Pages (map page, batches) | Paper, Map page and batches move out of the page header into the tools zone. |

A shared layout component (app-bar action, status line, canvas and tool groups) will hold the zones in code, so a new
step can't drift.
