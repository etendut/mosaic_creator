# Walkthrough

A short tour from a picture to printed cards: one card per stop, each pointing at the control it's about.

**Start.**

- **First visit.** The Image step's EmptyState offers it as a small text button, "Show me around", under the tip. It's on the page, not a pop-up you have to dismiss. It shows until the tour has been finished or skipped once, and the browser remembers that.
- **Any time.** ☰ → "Show me around", next to About. There's no (?) button in the app bar, which holds ☰, the steps and one action.
- **Without an image.** The tour starts by loading the sample picture, so the later steps have something to show. It never replaces an image you already have: if there is one, the tour uses it.

**Stops.** Seven, in step order. The tour moves to each stop's step itself.

| #   | Step     | Points at                                         | Text                                                                                     |
| --- | -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Image    | _Use this image_                                  | Drag and zoom to frame your picture, then use it.                                        |
| 2   | Bricks   | Plate (first tools group, or its tool-bar button) | Choose the plate and brick you'll build with. Size sets how many cards the mosaic needs. |
| 3   | Bricks   | The Info bar                                      | These numbers follow your choices: cards, bricks and the finished size.                  |
| 4   | Touch up | Brush                                             | Paint single bricks to sharpen faces and edges. Clean up removes stray bricks for you.   |
| 5   | Cards    | Card size                                         | Each card is one plate. At real size, builders lay the bricks straight on it.            |
| 6   | Parts    | _Download BrickLink XML_                          | Download the parts as a BrickLink wanted list. Spares add a few extra of each colour.    |
| 7   | Print    | The print action                                  | Print the map page for yourself and one card for each builder.                           |

Each stop is one or two short sentences: what you do there, then what it gets you. Use the control's own name, and never repeat a number from the Info bar.

**Card.**

- **Surface.** `tray` fill, a `groove` border, `radius-tray`, `shadow-float` and `space-2` padding. It's `tour-card` (320px) wide on desktop; on a phone, the screen less `space-2` each side.
- **Inside, top to bottom.** The counter, "3 of 7", in `body2` `muted`. The text in `body1` `ink`. Then a row of buttons: _Skip_ (text) at the start, then _Back_ (text) and _Next_ (outlined) at the end. On the last stop, _Next_ reads _Done_ and _Skip_ goes.
- **Why _Next_ is outlined.** The step's own main action stays the one contained button on screen, and it's often the thing the stop points at.

**Target.** The control a stop is about gets three rings, following its corners: a 2px `tray` gap, a 2px `azure` ring, and a `tour-halo` (4px) ring of `azure-outline`. The gap keeps the ring visible around an `azure` button, as on the ColorSwatch's current ring. The page isn't dimmed and has no scrim: the app stays usable, and using the control the tour points at is fine.

**Placement.** The card sits `space-1` from its target, on whichever side has room, and never covers the target. There's no arrow, because the ring marks the target.

- **Phone, target in the tool bar.** The card sits above the bar and any open panel.
- **Phone, target in the app bar or Info bar.** The card sits below them.
- **Off screen.** A target is scrolled into view before its card opens.

**Ending.** _Skip_, _Done_ and Esc end the tour, and so does changing step yourself. You can replay it from ☰.

**Interaction.**

- **Motion.** The card moves to the next stop without animation, and the ring has no pulse: no motion beyond MUI's defaults.
- **Focus.** The card is a `dialog` with `aria-modal="false"`, labelled by its counter and text. Focus moves to _Next_ when a stop opens, and returns to where the tour started when it ends.

**No (?) help.** Complex settings explain themselves with a HelpText line under the control, by the Help text rule. They get no (?) button or tooltip. Dithering, clean-up, card size and spares already have their lines.

The consumer supplies the stops: a target element, its step and the text. Planned for issue #22.
