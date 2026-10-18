# Mosaic Creator

Turn a picture into a LEGO mosaic and print numbered building cards, one per plate, for a group build.

Runs entirely in the browser from a single HTML file — no install, no server, no account, and images never leave
your machine. Supported browsers: Chrome and Edge.

## Using it

1. Open https://etendut.github.io/mosaic_creator/ in Chrome or Edge. To use it offline, save the page (Ctrl+S) and
   open the saved file; it's one self-contained HTML file.
2. **Image** — choose or drop a picture, crop/rotate/adjust it, then *Use this image*.
3. **Bricks** — pick the backing plate, the brick, and how many plates wide the mosaic is.
4. **Cards** — set the title, messages and card colour.
5. **Parts** — download or copy a BrickLink wanted-list XML.
6. **Print** — print the building cards. Each card shows the BrickLink colour id on every brick.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # unit tests (Vitest)
npm run lint
npm run typecheck
npm run build      # dist/index.html, a single self-contained file
```

- `src/mosaic/` — pure logic: colour matching, quantisation, cards, print layout, parts list, BrickLink XML.
- `src/data/catalog.json` — the bricks, plates and colours the app uses, trimmed from BrickLink's catalog download.
  Don't hand-edit; to refresh it, download Colors, Codes and Parts as XML from
  https://www.bricklink.com/catalogDownload.asp into `temp/bricklink/` and run
  `node scripts/build-catalog.mjs temp/bricklink`. The part list lives at the top of that script.
- `src/tabs/`, `src/components/` — the UI.

## Licence

MIT, see [LICENSE](LICENSE).

LEGO® is a trademark of the LEGO Group, which does not sponsor, authorize or endorse this project. Part and colour
data comes from the [BrickLink](https://www.bricklink.com) catalog.
