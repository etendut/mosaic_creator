# Refinements

Where the app as shipped (checked on the live site, 17 November 2026) falls short of this system, and what to change. The brand book above states the target; this list is the gap. Highest impact first.

## 1. Dark mode

The app ships light only. The tokens carry both themes; the app needs a theme switch that follows `prefers-color-scheme`, with MUI's `colorSchemes` fed from `tokens.json`.

## 2. Phone app bar

The first row repeats the current step's name ("Bricks") right above the step tabs that already show it highlighted. Drop the name: the row keeps ☰ and the main action, the tabs carry the step.
