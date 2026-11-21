# StepTabs

The app bar's numbered steps: Image, Bricks, Touch up, Cards, Parts, Print.

Each tab has a 22px circle in `step-number` type: `azure` filled with an `on-azure` number for the current step, an `azure` ring with ✓ for a finished one, a `groove` ring with a `muted` number for the rest. Steps that need an image are disabled until there is one.

The app bar is `tray` with a `groove` bottom border and sticks to the top: ☰ menu, the _Projects_ link and the project's name (see Two views in the README), the tabs (60px high on desktop), and the step's main action at the right. On a phone the first row holds ☰, the _Projects_ icon, the name and the action, and the tabs take the second, scrolling row; the highlighted tab names the step, so no page repeats it as a title. Static rendition of `StepLabel` in `src/app/App.tsx`.
