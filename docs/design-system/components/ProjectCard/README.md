# ProjectCard

One project in the Mosaics view: its picture, its name and when you last changed it, with the actions on that project.

**Look.** A Tray (`tray`, `groove` border, `radius-tray`, `space-2` padding, no shadow), at least `project-card` (220px) wide, filling its grid column. From the top:

- the thumbnail: the mosaic with its brick seams, full width, at its own proportions on a `plate` ground, `radius-control` corners. Before it loads, or for a file without one, a plain `tray` tile of the same size.
- the name in `subtitle1` `ink`, on one line, cut short with an ellipsis.
- "32 × 32 bricks, saved 3 Nov" in `body2` `muted`, with dates and sizes written as Content fundamentals says.
- a row of small text buttons, _Duplicate_ then _Delete_, in `muted`, `azure` on hover and focus.

**Opening.** The thumbnail and the name are one link to the project, at Bricks (Image if it has no picture yet). The whole card isn't a link, so the buttons stay separate targets.

**Current.** The open project's card has an `azure` ring outside a 2px `tray` gap and `aria-current="true"`, as on a ColorSwatch. It never takes the `azureWash` selected state.

**Actions.** _Duplicate_ copies the project as "Balloon (2)", puts it next in the grid, and doesn't open it. _Delete_ removes the project at once, and a Toast says "Deleted Balloon." with _Undo_. When a project won't open, its card shows "This file won't open." in `body2` and offers _Open the previous save_ in place of _Duplicate_.

**Accessibility.** Cards sit in a list (`ul`), each `li` labelled by the project's name. Each button's name includes the project ("Delete Balloon"), so a list of them reads clearly.

The consumer supplies the project entry (`name`, `savedAt`, `bricks`, `thumbnail`), whether it's current, and the open, duplicate and delete handlers. Planned in `.claude/plans/projects-library.md`.
