# InfoBar

The step's information as one quiet strip pinned to the top of the canvas column, replacing Info in the tools.

Up to four facts, the one people plan around first, each a `muted` 13px label over a 16px weight-500 value with tabular figures. On desktop it is a slim Tray above the canvas (`space-1` × `space-2` padding, `space-4` between facts); it stays in view as the column scrolls, so you can watch the numbers change while you adjust tools. On a phone it sits flush under the app bar as a full-width band of four columns, with shorter values ("256 mm"), always visible: no ⓘ button, no panel.

Rules: a fact is a number about the result, with its unit and × for sizes. Never a fact that repeats a setting already in view in the tools (Spares: None). Never more than four; if a step has more, the least-needed one goes.

The consumer supplies `facts` as `[label, value]` pairs. It is the only place a step's numbers appear.
