# InfoBar

The step's information as one quiet strip pinned to the top of the canvas column, replacing Info in the tools.

Up to four facts, the one people plan around first, each a `muted` 13px label over a 16px weight-500 value with tabular figures. On desktop it is a slim Tray above the canvas (`space-1` × `space-2` padding, `space-4` between facts); it stays in view as the column scrolls, so you can watch the numbers change while you adjust tools. On a phone it sits flush under the app bar as a full-width band (15px values, `space-2.5` apart, wrapping to a second row when it must), sticky, always visible: no ⓘ button, no panel.

Rules: a fact is a number about the result, with its unit and × for sizes. Never a fact that repeats a setting already in view in the tools (Spares: None). Four at most; if a step has more, the least-needed one goes. The one exception is a fact that only applies sometimes and matters on this step while it does: Touched up on Bricks, where a change can hide touch-ups.

The consumer supplies `facts` as `[label, value]` pairs. It is the only place a step's numbers appear.
