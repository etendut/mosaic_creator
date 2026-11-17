# HelpText

One help line, `body2` in `muted`, directly under the control it explains, `space-0.75` below it.

When: under a setting whose effect you can't see on the canvas (what a clean-up changes, what a backing plate means for the cards, how colours are matched). Never under a setting whose effect is right there on the canvas (crop shape, zoom, brightness). That is the whole rule, so two groups never differ just because one got a line and the other didn't.

What it says: the current choice and its consequence, in at most two short sentences. It changes with the choice. It never repeats a number the Info bar shows, never restates the label ("Choose the shape…"), and never shows a code the builder doesn't use (a hex colour).

Build it as one component that sets the colour itself (`<Typography variant="body2" color="textSecondary">` in MUI 9, not `color="text.secondary"`, which MUI 9 ignores). The consumer supplies the text.
