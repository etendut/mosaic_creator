# Toast

A short message about what just happened, after an action: "Cleaned up 7 bricks." "Template saved: your settings, without an image."

**Look.** One look for every message: an `ink` fill with `tray` text (an inverse of the page, so it reads over any mosaic), `body2`, `radius-control` corners, `shadow-float`, `space-1.5` × `space-2` padding, at most `toast-max` (480px) wide. An optional text action ("Undo") sits at the end in `toast-action`, weight 500.

**Errors** use the same shape with a `danger` fill, `on-danger` text and an error icon first, so the state never rests on colour alone, and a close button. An error stays until closed; a normal toast goes after 4 seconds. Success has no colour of its own: success is the normal toast.

**Where.** Bottom centre, `space-2` above the bottom of the window on desktop, and above the tool bar (and any open panel or strip) on a phone. One at a time; a new one replaces the old.

**Words.** What happened, then what to do next if anything, in the system's voice: a subject and a verb, no "Successfully", no exclamation marks. The words name the action as its button does.

The consumer supplies the text, an optional action (label and handler), and `error` for an error. Replaces the plain MUI `Snackbar` in `src/tabs/TouchUpTab.tsx` and the filled `Alert` in `src/components/ProjectMenu.tsx`.
