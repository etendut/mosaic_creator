# PhoneToolBar

Under `breakpoint-desktop` (900px) the tool groups become a bar along the bottom: one icon and label per group, `tool-bar` (60px) high, `tray` with a `groove` top border.

Tapping a group opens its settings in a panel just above the bar (`radius-panel` top corners, `shadow-panel`, at most 45% of the screen high), with the canvas still in view; tapping it again, or the canvas, closes it. The open or pressed item reads `azure`, weight 500, with a 3px `azure` top border; the rest `muted`. Info is not in the bar: it is the InfoBar under the app bar, always in view. Past about eight buttons the bar takes two 52px rows; on Touch up it is icons only, with the names read out.

The consumer supplies `ToolGroup`s (`id`, `label`, `icon`, `content` or `onPress`/`pressed`) to `StepLayout`. Icons are Material icons with an `aria-label`. From `src/ui/StepLayout.tsx`.
