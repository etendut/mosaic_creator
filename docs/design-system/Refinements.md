# Refinements

Where the app as shipped (checked on the live site, 17 November 2026) falls short of this system, and what to change. The brand book above states the target; this list is the gap. Highest impact first.

## 1. Canvas placement

- Bricks on desktop: the mosaic sits top-left with a large empty band to the right. Centre the canvas in the Stage, horizontally and vertically.
- Cards: one small card floats at the top of a large Stage. Centre it, or show a row of cards (A1, A2, A3) at real proportions.
- Image: the cropper paints a dark grey Stage, the only Stage with a fill. Acceptable for the crop shade, but make it `ink` at 70% so it belongs to the palette.
- Phone, Bricks: the mosaic takes the top third and the rest of the screen is empty studs. With the Info bar under the app bar and the canvas filling to the tool bar, the space is used.

## 2. Dark mode

The app ships light only. The tokens carry both themes; the app needs a theme switch that follows `prefers-color-scheme`, with MUI's `colorSchemes` fed from `tokens.json`.

## 3. Phone app bar

The first row repeats the current step's name ("Bricks") right above the step tabs that already show it highlighted. Drop the name: the row keeps ☰ and the main action, the tabs carry the step.
