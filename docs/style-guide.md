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
  editor's Export or Done. Examples: *Use this image*, *Download BrickLink XML*, *Print cards*. A step that only sets
  things up (Bricks, Touch up, Cards) has no main action; you move on with the step tabs.
- **Secondary action** (at most one, `outlined`): beside the main action on desktop, and in ☰ on a phone (*Copy
  XML*).
- There's no separate title on the page. The highlighted tab names the step, and the status line says what it's for.

### Middle: canvas

The result of the step, as large as fits: the photo, map, card, printed pages or the parts table. From top to bottom:

1. **Alerts** about the result: warnings and errors, as an MUI `Alert`.
2. **Status line:** one muted sentence, under 90 characters. Until there's something to report, it says what the step
   is for ("Choose a picture and frame the part that becomes the mosaic."). After that it says what a click does now
   or what just changed ("Click or drag on the map to make bricks Black. 3 bricks touched up.").
3. **Facts** about the result: the stats row (`MosaicSummary`) and the colours used.
4. **Canvas:** on the stud texture (`Stage`) or in a `Tray`. Full width on a phone, with only the 8 px gutter.

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
- **Steps that edit the canvas directly** (Touch up) use the same zone for their tools: a bottom bar of tools on a
  phone, and a vertical tool rail on desktop. The current tool's options show in the panel above the bar (phone) or
  under the rail (desktop).

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
| Main action | `contained`, one per step | app bar, right | Print cards |
| Secondary | `outlined` | beside the main action (desktop), ☰ (phone) | Copy XML |
| In a group | `text` (small) | under the setting it acts on | Save palette |
| Tools | icon + label (bar) or icon + tooltip (rail), with an `aria-label` | tools zone | Brush, Undo |
| Project and app | menu items | ☰ menu | Save project, About |
| Destructive | `text`, with confirmation or undo | in a group or ☰ | Reset to defaults |

- An action is named by what happens ("Print cards", not "Submit"). It keeps the same name everywhere: the button,
  the status line and any message after it.
- Each action lives in one place only. Printing is on the Print step only.
- Tool bars follow a photo editor's layout: tools first, then fixed actions (clean-up, undo, redo, before/after,
  clear). The current tool's options show only for the tools that use them. The fixed buttons never move.

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
- **Surfaces:** white `Tray` for working areas, panels and lists, and `Stage` (stud texture) behind the canvas.
  Panels have no shadow, except the phone tool panel, which sits over the canvas.
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
| Touch up | none | Brush, Eraser, Eyedropper, then clean-up, undo/redo, before/after, clear | The toolbar becomes the bottom bar (phone) and a left rail (desktop). Its icon buttons are about 30 px; make them 40 px on touch screens. |
| Cards | none | Size, Text, Colour | |
| Parts | Download BrickLink XML | Spares | Spares moves out of the page header into the tools zone. *Copy XML* is the secondary action. |
| Print | Print cards | Paper, Pages (map page, batches) | Paper, Map page and batches move out of the page header into the tools zone. |

A shared layout component (app-bar action, status line, canvas and tool groups) will hold the zones in code, so a new
step can't drift.
