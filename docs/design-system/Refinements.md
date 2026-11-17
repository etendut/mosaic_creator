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

## 2. Help text renders as body text

**Now.** Help lines ask for `color="text.secondary"`. MUI 9's `Typography` takes palette keys there (`textSecondary`), not the dotted path, so the value is ignored and help renders in `ink` at the same size as labels (checked on Cards: all three lines are rgb(34, 38, 42)). Help and labels look alike, so the column reads as one dense block.

**Change.** Use `color="textSecondary"`, or better one `HelpText` component, so every help line is `body2` in `muted`. Then a search for `color="text.` should find nothing.

## 3. Help text follows one rule

**Now.** Some groups explain themselves (Size, Colours, Colour matching, Spares), others say nothing (Backing plate, Touch up's clean-ups, Dithering's options), and Cards' lines are long and repeat Info ("8 cards per page on A4 landscape, 8.0 mm per brick").

**Change.** One help line under a setting whose effect you can't see on the canvas; none where you can. It describes the current choice and its consequence, in at most two short sentences, and never repeats a number shown in the Info bar. See the HelpText card.

| Where                                       | Now                          | Proposed                                                                          |
| ------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| Image · Frame, Adjust                       | none                         | none: the effect is on the canvas                                                 |
| Bricks · Backing plate                      | none                         | "Each card is one 8 × 8 plate: 64 bricks."                                        |
| Bricks · Brick                              | none                         | none                                                                              |
| Bricks · Colour matching, Dithering         | one line for matching        | one line for the pair, about the current combination                              |
| Touch up · Clean up single bricks           | none                         | "Changes bricks that match none of their neighbours."                             |
| Touch up · Clean up single bricks and pairs | none                         | "Also changes pairs that stand alone."                                            |
| Cards · Card size                           | 2 sentences + numbers        | "Bricks are printed at real size, so they can be laid straight on the card."      |
| Cards · Bag list                            | 2 sentences + count          | "Adds how many bricks of each colour the card needs, for packing a bag per card." |
| Cards · Card colour                         | "#4CAF50. Text on the card…" | "Text on the card turns black or white to stay readable." (no hex)                |

## 4. One selected state

**Now.** Three looks mean "selected": toggle groups (Crop shape, plate size, Spares, Card size, Brush size) use MUI's grey `action.selected`; plate and brick tiles use an `azureWash` fill with an `azure` border; the Touch up tool list uses grey. Grey reads as disabled next to the azure tiles.

**Change.** Selected is always `azureWash` fill, `azure` text at weight 500, and an `azure` border on the chosen item. Set it once in the theme (`MuiToggleButton` `&.Mui-selected`, `MuiListItemButton` `&.Mui-selected`). See the ChoiceRow card.

## 5. Numbers and units

- "256mm × 192mm" (Info, Bricks): the guide asks for "256 × 192 mm".
- "Plate 8 x 8" (plate tiles): the letter x; use ×.
- The card colour as a hex code: builders don't read hex. Show the swatch and a name.

## 6. Canvas placement

- Bricks on desktop: the mosaic sits top-left with a large empty band to the right. Centre the canvas in the Stage, horizontally and vertically.
- Cards: one small card floats at the top of a large Stage. Centre it, or show a row of cards (A1, A2, A3) at real proportions.
- Image: the cropper paints a dark grey Stage, the only Stage with a fill. Acceptable for the crop shade, but make it `ink` at 70% so it belongs to the palette.
- Phone, Bricks: the mosaic takes the top third and the rest of the screen is empty studs. With the Info bar under the app bar and the canvas filling to the tool bar, the space is used.

## 7. ColorSwatch

**Now.** A square chip with a solid 1px black border (raw hex, and invisible around Black in a dark theme), 24px high in a system where controls are 40px, and with `showName` the colour name printed on the brick colour, so its contrast changes per colour. Off colours are 25% opacity.

**Change.** See the ColorSwatch card: `radius-swatch` corners, an inset `swatch-edge` instead of the black border, a 500-weight tabular id, 32px high when clickable with a mouse and 44 × 40 on touch, the name beside the chip, and a `tray`-gapped `azure` ring for the current colour (brush colour, colour being swapped).

## 8. Toasts and the zoom control

**Now.** Two toast looks: Touch up uses MUI's plain dark-grey `Snackbar`, the project menu a filled `Alert` in MUI's saturated green or red, colours outside the tokens. The zoom control is an MUI `Paper` with elevation 2 and 12px corners, with no border.

**Change.** One Toast component (see its card): `ink` with `tray` text, errors in `danger` with an icon, success with no colour of its own. Where a message used to say how to undo ("Touch-ups cleared. Undo brings them back."), the toast carries an Undo action instead. The zoom control gets `tray`, a `groove` border, `radius-tray` and `shadow-float` (see ZoomControl).

## 9. Dark mode

The app ships light only. The tokens carry both themes; the app needs a theme switch that follows `prefers-color-scheme`, with MUI's `colorSchemes` fed from `tokens.json`.

## 10. Retire InfoList and MosaicSummary

Both become the InfoBar. `InfoList` (the tools' Info section) and `MosaicSummary` (a facts row on Bricks) go once the InfoBar is in.

## 11. Phone app bar

The first row repeats the current step's name ("Bricks") right above the step tabs that already show it highlighted. Drop the name: the row keeps ☰ and the main action, the tabs carry the step.
