# ControlSection

A titled group of tools in the desktop tools column: a `subtitle1` heading, then its settings `space-1.5` apart, with `space-2` padding and a `groove` rule between sections.

The tools column is a Tray `tools-column` (340px) wide, holding one ControlSection per tool group, all open, in the order you'd decide them. Nothing else goes in the column: the step's numbers live in the InfoBar above the canvas. An action that follows from the tools ends the column, above a `groove` rule.

The consumer supplies `title` and the settings as children. Help text goes directly under the control it explains, in `body2` and `muted`. Never hide settings behind a "More…" disclosure. From `src/components/StepLayout.tsx`.
