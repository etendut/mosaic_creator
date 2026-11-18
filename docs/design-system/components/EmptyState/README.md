# EmptyState

When a step can't show a result yet, the canvas holds one centred card: what to do, one main button, and a tip.

A Tray at most `empty-card` (380px) wide with `space-4` padding, centred text: the heading in `h2` (25px, 700), a `body1` lead in `muted`, one large contained button (`button-large`), and a `body2` tip in `muted`, the button `space-2.5` from each. On Image, until the Walkthrough has been finished or skipped once, a small text button, "Show me around", follows the tip. The tools zone stays empty until there's something to change.

The consumer supplies the heading, the lead, the action and the tip. Static rendition of the empty state in `src/steps/ImageStep.tsx`.
