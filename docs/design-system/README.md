# Mosaic Creator design system

The target for the interface: what every step should look like and how it should read. `tokens.json` holds the values, the sections below the rules, `components/` one guideline per component, and [Refinements](Refinements.md) the gaps between the app today and this target. It replaces the old style guide.

The same system, with live previews in light and dark, is published at https://claude.ai/artifact/6SByDsUBYrwJH4LfsQFxa1. This folder is the source: change it here, then republish.

Mosaic Creator turns a picture into a LEGO mosaic and prints numbered building cards for a group build. The interface stays in baseplate greys with one azure accent, so the mosaic carries all the colour. Names follow the workbench: `plate` is the background, `tray` the working surfaces, `groove` the borders.

## Content fundamentals

- Write in sentence case. No all-caps labels, no uppercase buttons.
- Keep it short, active and specific: a subject and a verb, no filler, no "simply" or "just".
- Talk to the reader as "you". Name things as builders know them: _plate_, _brick_, _card_, _colour_, not _grid cell_ or _palette entry_. British spelling: _colour_.
- Give numbers with their unit, and use × for sizes: _32 × 20 bricks_, _256 mm_, _8 × 8 plate_.
- Name an action by what happens, and keep the name everywhere: _Print cards_, _Download BrickLink XML_, _Use this image_. Never _Submit_ or _OK_.
- A message after an action says what happened and what to do next: "Template saved: your settings, without an image." "Touch-ups cleared. Undo brings them back." It's a toast, not standing text.
- No standing text on a page: no purpose sentences, no instructions the tools already show. Counts and sizes go in the Info bar.
- Colours always show their BrickLink id on a swatch, with the name beside the swatch (never on it) where there's room.
- No emoji. The only glyphs are ✓ in a finished step, × in sizes and → in a colour swap ("Red → Dark red").

## Colour

- Page: `plate` with the stud texture (below). Working surfaces: `tray`, bordered in `groove`.
- Text: `ink` for content, `muted` for help, status and labels. Both read on `tray` and `plate`.
- Accent: `azure` only, for the one thing that is current or primary: the contained main action, the current step, the selected tool, the focus ring. `azureDark` is its hover; `azureWash` a selected background. Text on an `azure` fill is `on-azure`.
- **Two themes**, with the same roles: a dark baseplate (`plate`, `plateDot`), dark trays, light `ink`, and a lighter `azure` that takes dark `on-azure` text. In dark, `azureDark` is the lighter hover step. Never pick colours per theme in a component: use the token and let the theme supply it. You choose the theme in ☰ (ThemeToggle): Auto, the default, follows the device; Light and Dark fix it. Printing is always light.
- MUI greys come from tokens too: `icon` for icon buttons and unselected toggles, `disabled` and `disabled-fill` for disabled controls, `azure-outline` for outlined buttons.
- Never use raw hex in components; use the tokens. Never add a second accent: the mosaic's own brick colours are the only other colour on screen.
- `groove` borders are 1.7:1 on `tray`. They separate surfaces; never let a border alone say a control is selected (pair it with `azure` or `azureWash`).

## Type

- Rubik throughout (400, 500, 700), on a 1.25 scale from a 16px base.
- Tool group titles: `subtitle1`. Body: `body1`. Help text and status lines: `body2` in `muted`, always, so help never reads as a label.
- Buttons and tabs: `button` (15px, 500, sentence case). Toggles: `toggle`. Counts under swatches: `caption`.
- No page titles: the highlighted step tab names the step, on both layouts.

## Surfaces

- **Stud texture.** The body is a baseplate: `plate` with `plateDot` dots of 3px radius every `stud-pitch` (16px), offset 8px. Print is plain white.
- **Tray**: `tray` fill, 1px `groove` border, `radius-tray`, `space-2` padding, no shadow. For the tools column, panels and lists.
- **Stage** holds the canvas with no background of its own, so the studs run through it unbroken: `radius-stage`, `space-1.5` padding on phones, `space-3` from 600px.
- Shadows only on what floats over the canvas: the phone tool panel (`shadow-panel`), toasts, the zoom control and walkthrough cards (`shadow-float`). Everything else is `shadow-none`.

## Layout

Every step is laid out like a photo editor, with three zones that never move.

- **App bar** (`tray`, `groove` bottom border, sticky): ☰ menu at the left, the step tabs, and at most one contained main action at the right.
- **Canvas**: the result as large as it fits, full width on a phone with the 8px gutter. Above it, in this order and nothing else: the Info bar, alerts about the result, and facts that are also tools (Colours used).
- **Tools**: everything that changes the canvas, in groups in the order you'd decide them. On desktop (from `breakpoint-desktop`, 900px) a 340px `tools-column` Tray with every group open as a ControlSection, holding only tools. On a phone a bottom tool bar (`tool-bar`, 60px) with icon and label per group; a group opens a panel above it, at most 45% of the screen high.
- **Info bar**: the step's numbers, four at most (plus one that only shows when it applies), in one strip pinned to the top of the canvas column on desktop and flush under the app bar on a phone, always in view. Never in the tools, never behind a button, never a fact that repeats a setting.
- **Canvas placement**: centre the result in the Stage, both ways. A single small result (one card) is centred, not parked at the top.
- Show choices, don't hide them: up to about six options is a ChoiceRow of toggles or radios, never a dropdown. No "More…" disclosures; a step whose tools need hiding is doing two jobs: split it.
- Spacing in 8px units: `space-2` between zones and groups, `space-1`–`space-1.5` inside a group.
- Check every step at 390px wide. Nothing scrolls sideways.

```
Phone (under 900 px)                    Desktop (900 px and wider)
┌────────────────────────────┐          ┌──────────────────────────────────────────────────────────┐
│ ☰                  [Action]│ app bar  │ ☰  ①Image ②Bricks ③Touch up ④Cards ⑤Parts ⑥Print [Action]│
│ ①Image ②Bricks ③Touch… ›   │          ├──────────────────┬───────────────────────────────────────┤
├────────────────────────────┤          │ Tools            │ Cards 12 · Bricks 768 · …   Info bar  │
│ Cards Bricks Mosaic Finish │ Info bar │ ┌──────────────┐ │ ┌───────────────────────────────────┐ │
├────────────────────────────┤          │ │ Plate        │ │ │                                   │ │
│ ┌────────────────────────┐ │          │ ├──────────────┤ │ │                                   │ │
│ │        canvas          │ │ canvas   │ │ Brick        │ │ │             canvas                │ │
│ │     (full width)       │ │          │ ├──────────────┤ │ │                                   │ │
│ └────────────────────────┘ │          │ │ Size         │ │ │                                   │ │
│ ┌────────────────────────┐ │          │ ├──────────────┤ │ └───────────────────────────────────┘ │
│ │ open tool's settings   │ │ panel    │ │ Colours      │ │                                       │
│ └────────────────────────┘ │          │ └──────────────┘ │                                       │
│ [Plate][Brick][Size][Col.] │ tool bar └──────────────────┴───────────────────────────────────────┘
└────────────────────────────┘
```

### One job per step

A step does one job, named by its tab. The signs it's doing two: its tools need more than one screen on desktop, or more than five groups in the phone bar; it has tools for two different results (setting up the mosaic _and_ editing single bricks); you'd describe its purpose with "and". Split it into two steps, as Bricks and Touch up were split. Don't hide controls instead.

### Steps that edit the canvas (Touch up)

- All the tools are one set, in the same order on both layouts, with dividers between: history (undo, redo, before/after), the tools (brush, eraser, eyedropper), the brush palette (colour ▾, size, shape; always in view), clean-up (one button per strength), and clear all.
- Desktop: one Tools section in the column, every button labelled with icon and name. Phone: the palette is a compact strip in the bar's style (swatch ▾, − size +, one shape toggle) above an icons-only bottom bar, with the names read out. Past about eight buttons the bar takes two rows (history and tools, then clean-up and clearing), so every button stays at least 40px wide.
- A tool is on from the start, so there is no View tool.
- After an action, a Toast says what happened: "Cleaned up 7 bricks." "Touch-ups cleared." with an Undo action. On a phone it sits just above the tools.

### A canvas you edit zooms and scrolls

Like a document or photo viewer: it fills the space to the bottom of the window (or the phone's tools) in a scrolling box, fitted at 100%; zoomed in, it's bigger than the box, with scroll bars. Ctrl + wheel or a trackpad pinch zooms around the pointer, and a plain wheel scrolls; pinch and two-finger drag on touch screens; Space or middle-button drags scroll; a ZoomControl sits in the corner (− · % · + · fit). The canvas redraws sharper as it zooms. One finger still paints: it waits until it moves or lifts, so a pinch never paints.

### Empty states

When a step can't show a result yet, the canvas holds one centred EmptyState card: what to do, one main button, and a tip. The tools zone stays empty until there's something to change. On Image, until you've finished or skipped the Walkthrough once, a text button under the tip offers it: "Show me around".

## Help text

- One rule decides whether a setting gets a help line: if you can see its effect on the canvas, no line; if you can't, one line. Two groups never differ just because one was written up and the other wasn't.
- The line describes the current choice and its consequence and changes with it: "Each card is one 8 × 8 plate: 64 bricks." At most two short sentences.
- Directly under the control, `body2` in `muted`. Never repeat an Info bar number, never restate the label, never show a code builders don't use (hex).
- Help lives in that line, never behind a (?) button or a tooltip. The Walkthrough is for finding your way through the steps, not for explaining settings.

## Actions

| Kind            | Style                              | Where                                                                                     |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Main action     | contained `azure`, one per step    | app bar right, or ending the tools when it follows from them                              |
| Secondary       | outlined                           | beside the main action on desktop, in ☰ on a phone                                       |
| In a group      | small text button                  | under the setting it acts on                                                              |
| Tool            | icon + label, with an `aria-label` | tools zone                                                                                |
| Destructive     | text, with confirmation or undo    | in a group or ☰                                                                          |
| Project and app | menu items                         | ☰ (open, save, template, reset, forget image, Show me around, Install app, Theme, About) |

- Each action lives in one place only: printing is on the Print step only.
- An action that follows from the tools (_Print cards_ after Paper and Pages; _Download BrickLink XML_ after Spares) ends the tools, with one line above it saying what it will do ("12 cards on 2 pages, 8 per A4 landscape page."). On desktop it is the last block of the column; on a phone a strip just above the tool bar. It is then the step's main action, so the app bar has none.

## States and interaction

- Every button and toggle is at least `tap-target` (40px). The one exception is a ColorSwatch in a grid with a mouse (32px high), which grows to `swatch-touch-width` × 40px on touch screens.
- Focus: a 2px solid `azure` outline, offset 2px, on `:focus-visible`.
- **One selected state** for toggles, tiles (plate, brick) and tool lists: `azureWash` fill, `azure` text at weight 500, `azure` border. Never MUI's grey selected, which reads as disabled next to azure.
- Selected tool-bar item: `azure` text, weight 500, a 3px `azure` top border. Unselected: `muted`.
- Disabled: 35% opacity in the tool bar; a turned-off swatch is 30% opacity and struck through.
- Messages after an action are a Toast: one look, `ink` with `tray` text; errors in `danger` with an icon, staying until closed. `danger` is for errors only.
- No motion beyond MUI's defaults, except the Walkthrough's smooth scroll to a target off screen.
- The current step is in the URL (`#/touch-up`): a refresh comes back to it, and the browser's back and forward move between steps. Without an image, every step shows Image.

## Installing and offline

- The app installs like any other: its own window, and the mark as its icon. After one visit it opens and works with no connection, since everything it does happens on the device.
- ☰ offers _Install app_ ("Use it offline, in its own window") only when the browser can install it, and not once it's installed. On an iPhone or iPad, where a page can't start the install, the item's second line says how instead: "In Safari, tap Share, then Add to Home Screen."
- When a new version has been published, a Toast that waits says "A new version is ready." with _Reload_. Nothing reloads by itself, so work in progress is never lost.

## Iconography

- Material icons from `@mui/icons-material`, outlined where a variant exists (`InfoOutlined`). Always with a label or tooltip and an `aria-label`.
- The mark (`src/favicon.svg`) is a 2 × 2 brick seen from above: four white studs on an `azure` square. It's the favicon; the app shows no logo in its own interface.

## The steps

| Step     | Main action                                                            | Tools (desktop column; phone bar)                                                        | Info bar                                                                      |
| -------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Image    | _Use this image_ (app bar)                                             | Frame, Adjust                                                                            | Picture                                                                       |
| Bricks   | none                                                                   | Plate, Brick, Size, Colours, Colours used                                                | Cards · Bricks · Mosaic · Finished size; Touched up while there are touch-ups |
| Touch up | none                                                                   | Undo, Redo, Before / after; Brush, Eraser, Eyedropper; palette; two clean-ups; Clear all | Touched up · Bricks · Colours                                                 |
| Cards    | none                                                                   | Card size, Card text, Card colour                                                        | Cards · Pages · Per page · Brick                                              |
| Parts    | _Download BrickLink XML_ and _Copy XML_, ending the tools under Spares | Spares                                                                                   | Parts · Lots                                                                  |
| Print    | _Print map page_ / _Print cards_, ending the tools under its summary   | Paper, Pages                                                                             | Cards · Card pages · Per page                                                 |

A new step gets the layout, tap targets and states by using `StepLayout`, `AppBarAction`, `ChoiceRow` and the theme, not its own controls.

## Checking a change

For every change to the interface:

1. Tests through the whole app (Testing Library), with coverage of 80% or more.
2. Playwright in Chrome at 1280 × 800 and 390 × 844: click through the change, take screenshots, check that nothing scrolls sideways, in light and dark.
3. A `frontend-design` review of the step's layout, to keep it from getting busy.
4. Check the step against this system: the three zones and the Info bar, at most one main action, settings only in the tools, help text by the rule, one selected state, tokens not raw hex.
