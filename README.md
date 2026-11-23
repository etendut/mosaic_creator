# Mosaic Creator

Turn a picture into a LEGO mosaic and print numbered building cards, one per plate, for a group build.

Runs entirely in the browser from a single HTML file — no install, no server, no account, and images never leave
your machine. Supported browsers: Chrome and Edge.

## Using it

1. Open https://etendut.github.io/mosaic_creator/ in Chrome or Edge. To use it offline, save the page (Ctrl+S) and
   open the saved file; it's one self-contained HTML file.
2. **Image** — choose or drop a picture, crop/rotate/adjust it, then _Use this image_.
3. **Bricks** — pick the backing plate, the brick, and how many plates wide the mosaic is.
4. **Cards** — set the title and messages. Cards print white, with bricks at real size and a bag list of the bricks each one needs.
5. **Parts** — download or copy a BrickLink wanted-list XML.
6. **Print** — print the building cards. Each card shows the BrickLink colour id on every brick.

Use **Project → Save project** to keep everything in one `.mosaic.zip` you can reopen or share. It's an ordinary
zip: `image.png` is the edited image, `project.json` the settings and `bricklink-wanted-list.xml` the parts, so
they can be recovered without the app. **Save as template** keeps just the settings, so the next mosaic only needs a new
image: open the template, then choose the image. The browser also remembers your settings and last image between visits,
on this device only; **Project → Reset to defaults** clears the settings and **Project → Forget image** the image.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # tests (Vitest)
npm run test:coverage  # tests with coverage; fails below 80% (CI runs this)
npm run lint
npm run typecheck
npm run build      # dist/index.html, a single self-contained file
```

Interface changes follow the [design system](docs/design-system/README.md): the tokens, the zones every step has, where
actions, settings and numbers go, and how text reads. [Refinements](docs/design-system/Refinements.md) lists where the
app doesn't match it yet.

Pushes to `main` deploy to GitHub Pages through the `gh-pages` branch. Each pull request gets a preview at
`https://etendut.github.io/mosaic_creator/pr-preview/pr-<number>/`, linked in a comment on the PR and removed when
the PR closes. Previews share the live site's origin, so they see the same saved settings and image.

The live site is also an installable app that works offline: `public/` holds its manifest, icons and service worker
(`sw.js`), which the build stamps with the commit so each deploy installs as a new version. The service worker runs
only on the live site, never on PR previews. To try it locally, `npm run build && npm run preview` (localhost counts
as secure). The single-file `mosaic-creator.html` from CI stays one file and needs none of this.

- `src/mosaic/` — pure logic: colour matching, quantisation, cards, print layout, parts list, BrickLink XML.
- `src/data/catalog.json` — the bricks, plates and colours the app uses, trimmed from BrickLink's catalog download.
  Don't hand-edit; to refresh it, download Colors, Codes and Parts as XML from
  https://www.bricklink.com/catalogDownload.asp into `temp/bricklink/` and run
  `node scripts/build-catalog.mjs temp/bricklink`. The part list lives at the top of that script.
- `src/steps/` — one component per step (Image, Bricks, Touch up, Cards, Parts, Print), tested through the whole app
  with Testing Library.
- `src/ui/` — the design system's components (Tray, ChoiceRow, ColorSwatch, InfoBar, Toast, ZoomControl, the step
  layout), one per guideline in `docs/design-system/components/`.
- `src/components/` — the app's own pieces built from them: the card map, building cards, print pages, part pickers,
  touch-up tools, the ☰ menu.
- `src/app/` — the app shell and theme. `src/hooks/` — React hooks: the mosaic's state (`useMosaic`), zoom and
  pointer handling. `src/lib/` — browser plumbing: image storage, downloads, the version.
- `src/test/` — test setup. jsdom has no canvas, image decoding or IndexedDB, so `fakes.ts` stands in for them
  (a canvas holding a known picture, images that load, fake-indexeddb) and the real app code runs on top.

## Licence

MIT, see [LICENSE](LICENSE).

LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this project. Part and colour
data comes from the [BrickLink](https://www.bricklink.com) catalog.
