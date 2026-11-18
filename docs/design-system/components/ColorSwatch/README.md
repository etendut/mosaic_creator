# ColorSwatch

A brick colour as a chip labelled with its BrickLink id, matching the numbers printed on the cards.

**Look.** A rounded chip (`radius-swatch`, 4px) filled with the brick colour, with a 1px inset `swatch-edge` so White shows on a white tray and Black on a dark one. No solid border. The id is `swatch-id` (13px, 500, tabular figures) in black or white, whichever reads on the fill. The brick colour is content: it is the only raw colour in the interface, and the chip around it is all tokens.

**Sizes.** Display (parts table, menus, the map page): `swatch-width` × `swatch-height` (36 × 24). A swatch you click: 36 × `swatch-control-height` (32) with a mouse, `swatch-touch-width` × `tap-target` (44 × 40) on a touch screen. Grids of swatches sit `space-0.75` apart.

**States.** Off (a palette colour turned off): 30% opacity, id struck through, `aria-pressed="false"`. Current (the brush colour, the colour being swapped): a 2px `azure` ring outside a 2px `tray` gap, the selected state in swatch form. Focus: the system focus ring.

**Names.** The name goes beside the chip in `body2` `ink`, never inside it on the brick colour.

The consumer supplies `color` (`{id, name, hex}`) and, for a control, `onClick` plus `pressed` (on/off) or `current`. From `src/ui/ColorSwatch.tsx`.
