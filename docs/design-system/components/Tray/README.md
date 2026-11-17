# Tray

The one working-surface treatment: a white `tray` box with a 1px `groove` border, `radius-tray` corners, `space-2` padding and no shadow.

Use it for the tools column, panels and lists. Its sibling **Stage** holds the canvas (the photo, map, cards): no background, `radius-stage`, `space-1.5` padding on phones and `space-3` from 600px, so the page's studs run through it unbroken (the dashed line in the preview only marks its edge). Both drop their padding and radius in print.

The consumer supplies the children and any extra `sx`. From `src/components/Tray.tsx`.
