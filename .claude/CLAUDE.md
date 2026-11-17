# Mosaic Creator

## Interface work

Any change to what the app looks like or says follows the design system in `docs/design-system/`:

- Read `docs/design-system/README.md` before changing a step, and the component's guideline in
  `docs/design-system/components/<Name>/README.md` before changing or adding that component.
- Values come from `docs/design-system/tokens.json`. `src/theme.ts` must agree with it; never add a raw hex,
  size or radius that isn't a token. A new value goes into `tokens.json` first.
- `docs/design-system/Refinements.md` is the backlog: where the app doesn't match the system yet. When a change
  closes an item, remove it from the list in the same change. When you find a new gap, add it.
- Before calling interface work done, run the README's "Checking a change" list.

The system is also published, with live previews in light and dark, at
https://claude.ai/artifact/6SByDsUBYrwJH4LfsQFxa1. The files here are the source; after changing them, republish the
artifact (read it, update the changed `project/` files) so the two match.

## Visibility

Public (github.com/etendut/mosaic_creator). Claude's memory for this repo stays outside it, at the harness default
path; `.claude/` holds only what's fine to publish: these instructions, plans (`.claude/plans/`) and working docs
(`.claude/work/`). Keep session IDs, quoted conversation and anything personal out of them.
