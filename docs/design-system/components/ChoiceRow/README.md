# ChoiceRow

A short choice shown as a full-width row of toggle buttons, so every option is in view.

Use it for up to about six options (Paper: A4, Letter, A3), never a dropdown. Each toggle is at least `tap-target` (40px) high, `toggle` text, `groove` outline; the chosen one is the system's one selected state: `azureWash` fill, `azure` text at weight 500, `azure` border. Plate and brick tiles and the Touch up tool list use the same state.

The consumer supplies `label`, `value`, `onChange`, `options` as `[value, label]` pairs, and an optional `help` line shown under the row in `muted`. From `src/ui/ChoiceRow.tsx`.
