# ZoomControl

The small control in the corner of a canvas you edit: zoom out, the zoom level, zoom in, fit.

**Look.** A `tray` bar with a 1px `groove` border, `radius-tray` corners and `shadow-float`, floating `canvas-inset` (20px) from the canvas box's bottom and right edges, clear of the scroll bars. Three 40px icon buttons (`ZoomOut`, `ZoomIn`, `FitScreen`) in `icon`, `disabled` at their limits (100%, 2000%, already fitted). The level sits between − and + in `body2` at weight 500 with tabular figures, `zoom-readout` (52px) wide so the buttons never shift.

**Behaviour.** + and − zoom by ×1.5 around the centre of the view; fit returns to 100% and the top left. Each button has a tooltip and an `aria-label` ("Zoom in", "Zoom out", "Fit to screen"); the level is labelled "Zoom level". Pinch, Ctrl + wheel and two-finger drag do the same on the canvas itself (see "A canvas you edit zooms and scrolls").

The consumer supplies the zoom and the three handlers. In `src/components/ZoomControl.tsx`, used by `MosaicPreview`.
