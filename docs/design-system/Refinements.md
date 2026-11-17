# Refinements

Where the app as shipped (checked on the live site, 17 November 2026) falls short of this system, and what to change. The brand book above states the target; this list is the gap. Highest impact first.

## 1. Info gets its own home: the Info bar

**Now.** Info is the first section of the tools column on desktop and an ⓘ button at the end of the phone tool bar. It breaks the guide's own rule that the tools zone holds only what changes the canvas; it pushes the first real tool below the fold (on Bricks, 5 rows before Backing plate); and on a phone the numbers people plan around are hidden behind a tap. Some rows echo a setting instead of informing (Parts: "Spares: None: exact counts", right above the Spares toggle).

**Change.** Move Info out of the tools into an **Info bar**: one quiet strip pinned to the top of the canvas column on desktop, and just under the app bar on a phone. At most four facts, the deciding one first, label over value. Drop any fact that repeats a setting shown in the tools. Remove the ⓘ group from the phone bar. See the InfoBar card.

| Step     | Facts, in order                                                        |
| -------- | ---------------------------------------------------------------------- |
| Image    | Picture 640 × 480 px                                                   |
| Bricks   | Cards 12 (4 × 3) · Bricks 768 · Mosaic 32 × 24 · Finished 256 × 192 mm |
| Touch up | Touched up 0 · Bricks 768 · Colours 12                                 |
| Cards    | Cards 12 · Pages 2 · Per page 8 · Brick 8.0 mm                         |
| Parts    | Parts 780 · Lots 13                                                    |
| Print    | Cards 12 · Card pages 2 · Per page 8                                   |

## 2. Numbers and units

- "256mm × 192mm" (Info, Bricks): the guide asks for "256 × 192 mm".
- "Plate 8 x 8" (plate tiles): the letter x; use ×.
- The card colour as a hex code: builders don't read hex. Show the swatch and a name.

## 3. Canvas placement

- Bricks on desktop: the mosaic sits top-left with a large empty band to the right. Centre the canvas in the Stage, horizontally and vertically.
- Cards: one small card floats at the top of a large Stage. Centre it, or show a row of cards (A1, A2, A3) at real proportions.
- Image: the cropper paints a dark grey Stage, the only Stage with a fill. Acceptable for the crop shade, but make it `ink` at 70% so it belongs to the palette.
- Phone, Bricks: the mosaic takes the top third and the rest of the screen is empty studs. With the Info bar under the app bar and the canvas filling to the tool bar, the space is used.

## 4. ColorSwatch

**Now.** A square chip with a solid 1px black border (raw hex, and invisible around Black in a dark theme), 24px high in a system where controls are 40px, and with `showName` the colour name printed on the brick colour, so its contrast changes per colour. Off colours are 25% opacity.

**Change.** See the ColorSwatch card: `radius-swatch` corners, an inset `swatch-edge` instead of the black border, a 500-weight tabular id, 32px high when clickable with a mouse and 44 × 40 on touch, the name beside the chip, and a `tray`-gapped `azure` ring for the current colour (brush colour, colour being swapped).

## 5. Toasts and the zoom control

**Now.** Two toast looks: Touch up uses MUI's plain dark-grey `Snackbar`, the project menu a filled `Alert` in MUI's saturated green or red, colours outside the tokens. The zoom control is an MUI `Paper` with elevation 2 and 12px corners, with no border.

**Change.** One Toast component (see its card): `ink` with `tray` text, errors in `danger` with an icon, success with no colour of its own. Where a message used to say how to undo ("Touch-ups cleared. Undo brings them back."), the toast carries an Undo action instead. The zoom control gets `tray`, a `groove` border, `radius-tray` and `shadow-float` (see ZoomControl).

## 6. Dark mode

The app ships light only. The tokens carry both themes; the app needs a theme switch that follows `prefers-color-scheme`, with MUI's `colorSchemes` fed from `tokens.json`.

## 7. Retire InfoList

`InfoList` (the tools' Info section) goes once the InfoBar is in. `MosaicSummary` stays: it is the facts row on the printed map page, not part of a step.

## 8. Phone app bar

The first row repeats the current step's name ("Bricks") right above the step tabs that already show it highlighted. Drop the name: the row keeps ☰ and the main action, the tabs carry the step.
