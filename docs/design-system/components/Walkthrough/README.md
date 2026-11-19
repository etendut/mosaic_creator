# Walkthrough

A short tour from a picture to printed cards: one card per stop, each pointing at the control it's about.

**Start.**

- **First visit.** The Image step's EmptyState offers it as a small text button, "Show me around", under the tip. It's on the page, not a pop-up you have to dismiss. It shows until the tour has been finished or skipped once, and the browser remembers that.
- **Any time.** ☰ → "Show me around", next to About. There's no (?) button in the app bar, which holds ☰, the steps and one action.
- **Without an image.** The tour starts by loading the sample picture, so the later steps have something to show. It never replaces an image you already have: if there is one, the tour uses it.

**Stops.** Seven, in step order. The tour moves to each stop's step itself.

| #   | Step     | Points at                                         | Text                                                                                                              |
| --- | -------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Image    | _Use this image_                                  | Drag and zoom to frame your picture, then press _Use this image_ to turn it into bricks.                          |
| 2   | Bricks   | Plate (first tools group, or its tool-bar button) | Pick the plate and brick you'll build with. Raise _Size_ for a bigger mosaic with more cards.                     |
| 3   | Bricks   | The Info bar                                      | Check here as you change settings: you'll see how many cards and bricks you need, and how big the mosaic ends up. |
| 4   | Touch up | Brush                                             | Paint single bricks to sharpen faces and edges. Press _Clean up_ to clear stray bricks in one go.                 |
| 5   | Cards    | Card size                                         | Each card covers one plate. Pick _Real size_ and builders can lay bricks straight on the card.                    |
| 6   | Parts    | _Download BrickLink XML_                          | Download the parts as a BrickLink wanted list. Add _Spares_ if you want a few extra of each colour.               |
| 7   | Print    | The print action                                  | Print the map page for yourself and one card for each builder.                                                    |

Each stop is one or two short sentences: what you do there, then what it gets you. Use the control's own name, and never repeat a number from the Info bar.

**Card.**

- **Surface.** `tray` fill, a `groove` border, `radius-tray`, `shadow-float` and `space-2` padding. It's `tour-card` (320px) wide on desktop; on a phone, the screen less `space-2` each side.
- **Inside, top to bottom.** The counter, "3 of 7", in `body2` `muted`. The text in `body1` `ink`. Then a row of buttons: _Skip_ (text) at the start, then _Back_ (text) and _Next_ (outlined) at the end. On the last stop, _Next_ reads _Done_ and _Skip_ goes.
- **Why _Next_ is outlined.** The step's own main action stays the one contained button on screen, and it's often the thing the stop points at.

**Target.** The control a stop is about gets one ring: a 2px `azure` outline `space-1` out from it, with `radius-control` corners (react-joyride's spotlight). The `space-1` gap keeps the ring clear of an `azure` button.

**The rest of the page.** It isn't dimmed, but while the tour runs it doesn't take clicks: only the target and the card do (a transparent overlay). So the tour can't be lost by wandering off, and using the control the tour points at is fine.

**Placement.** The card sits `space-1` outside the ring, on whichever side has room, and never covers the target. There's no arrow, because the ring marks the target.

- **Target in the app bar** (_Use this image_). The card hangs under the Info bar, at its end by the action, so it covers neither.
- **Phone, target in the bottom stack** (the tool bar, the palette strip, the action strip). The card sits above the whole stack, so none of it is covered.
- **Never over the app bar or Info bar.** A card that would rise into them slides down beside its target instead.
- **At the screen's edge** (a phone's tool bar, its full-width Info bar). The ring sits 2px inside the target instead of `space-1` outside, so no side is cut off.
- **Off screen.** A target is scrolled into view before its card opens.

**Ending.** _Skip_, _Done_ and Esc end the tour. Each counts as having seen it, so the EmptyState stops offering it. You can replay it from ☰.

**Interaction.**

- **Motion.** A target off screen is scrolled into view smoothly (300 ms), so you see where the page went: the one exception to "no motion beyond MUI's defaults". The card moves to the next stop without animation, and the ring has no pulse.
- **Focus.** The card is a `dialog` with `aria-modal="true"`, labelled by its counter and text, and keeps focus while the tour runs. Focus moves to _Next_ when a stop opens, and returns to where the tour started when it ends.

**No (?) help.** Complex settings explain themselves with a HelpText line under the control, by the Help text rule. They get no (?) button or tooltip. Dithering, clean-up, card size and spares already have their lines.

Built on react-joyride, which places the card (Floating UI), scrolls to the target, waits for it after a step change, and draws the spotlight; the card itself is ours (`tooltipComponent`). The consumer supplies the stops: a target, its step and the text. In `src/components/Walkthrough.tsx`.
