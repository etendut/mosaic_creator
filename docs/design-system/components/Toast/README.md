# Toast

A short message about what just happened, after an action: "Cleaned up 7 bricks." "Template saved: your settings, without an image."

**Look.** One look for every message: an `ink` fill with `tray` text (an inverse of the page, so it reads over any mosaic), `body2`, `radius-control` corners, `shadow-float`, `space-1.5` × `space-2` padding, at most `toast-max` (480px) wide. An optional text action ("Undo") sits at the end in `toast-action`, weight 500.

**Errors** use the same shape with a `danger` fill, `on-danger` text and an error icon first, so the state never rests on colour alone, and a close button. An error stays until closed; a normal toast goes after 4 seconds. Success has no colour of its own: success is the normal toast.

**A message that waits.** One that needs you to act, and would be missed if it went, stays until you act on it or close it: the normal look, with its action and a close button. Three cases: an update ("A new version is ready." with _Reload_), a save that failed, and a prompt.

**Prompts.** A Toast you didn't ask for ("7 mosaics changed since your last backup." with _Back up_) waits, and follows the Prompts rule in the README: at most one a visit, when you open Projects, never while you're working on a step, and closing it means no until its reason comes back.

**Where.** Bottom centre, `space-2` above the bottom of the window on desktop, and above the tool bar (and any open panel or strip) on a phone. One at a time; a new one replaces the old. A toast sits under any menu or dialog you open, so one that waits never covers what you're doing.

**Words.** What happened, then what to do next if anything, in the system's voice: a subject and a verb, no "Successfully", no exclamation marks. The words name the action as its button does.

The consumer supplies the text, an optional action (label and handler), `error` for an error, and `stays` for a message that waits. From `src/ui/Toast.tsx`, used by Touch up and the ☰ menu.
