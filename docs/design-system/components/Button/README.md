# Button

The app's actions, as MUI `Button` with the theme's overrides: sentence case, 15px weight 500, no elevation, at least 40px high.

Static rendition, hand-written from `src/app/theme.ts`; the app uses MUI's own `Button`.

- **contained** (`azure` fill, `on-azure` text, `azureDark` on hover): the step's one main action. Put it in the app bar through `AppBarAction`, or at the end of the tools when it follows from them (_Print cards_).
- **outlined**: at most one secondary action, beside the main one on desktop and in ☰ on a phone (_Copy XML_).
- **text**, small: an action inside a tool group, under the setting it acts on (_Save palette_). Destructive actions are text buttons with a confirmation or undo.
- Name it by what happens. Never two contained buttons on one step.
