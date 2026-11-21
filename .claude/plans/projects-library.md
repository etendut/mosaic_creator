# Projects: a library of mosaics in a local folder

A new **Projects** tab that lists every mosaic you've made, opens one, starts a new one, and keeps them all as
ordinary `.mosaic.zip` files in a folder you choose. No cloud service: if the folder sits inside Google Drive,
OneDrive or Dropbox on your computer, their own sync apps copy it. The app never talks to them.

## Where it stands today

- A project is already one self-contained file: `packProject` / `unpackProject` in `src/mosaic/project.ts` write
  and read a zip of `project.json`, `image.png` and the BrickLink wanted list. The library stores these zips
  unchanged, so a file in the folder is the same file ☰ → Save project downloads today.
- The browser remembers one project only: the settings in localStorage (`useMosaic.ts`, `mosaic-creator:settings`)
  and the last image in IndexedDB (`src/lib/imageStore.ts`, key `last`).
- Steps live in `STEPS` in `src/app/App.tsx` and the URL hash (`useStepRoute`). Without an image, every step
  shows Image.

## Decisions to confirm

1. **A browser library where folders aren't available.** `showDirectoryPicker()` exists in Chromium on desktop and
   recent Chrome for Android, not in Firefox or on iPhone and iPad. Folder-only would leave those users with no
   library, and would remove the "remembers your last mosaic" behaviour they have now. Recommendation: every
   browser gets a library in IndexedDB; where the browser can, _Choose folder…_ moves it into a folder. One
   storage interface, two backends.
2. **Saving happens automatically.** The app already keeps your current mosaic without asking; the library
   extends that to every mosaic. The open project saves itself about two seconds after your last change. ☰ →
   _Save project_ becomes _Download project_ (a copy to send or back up). The alternative, an explicit Save, adds
   an unsaved state and a "leave without saving?" prompt the app doesn't have today.
3. **Projects is a tab, not a step.** It sits first, before ① Image, with a folder icon in place of a number,
   always enabled (it needs no image) and never shown as ✓ done. The numbered steps keep their numbers. With
   projects in the library, the app opens on Projects; with none, on Image as today.
4. **Templates stay out of the library for now.** Files ending ` template.mosaic.zip` are ignored in the folder;
   ☰ → _Save as template_ keeps downloading them.

## The tab, by the design system

Checked against `docs/design-system/README.md`: three zones, Info bar, one main action, tools only in the tools.

| Zone        | Desktop                                                                    | Phone                                    |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| App bar     | ☰, Projects + ① to ⑥, main action _New mosaic_                             | same, Projects first in the tab row      |
| Info bar    | Projects 7 · Bricks 5,120 · Space 18 MB                                    | same band                                |
| Canvas      | a grid of project cards in the Stage, newest first                         | one column of cards, full width          |
| Tools       | Folder, Sort, in the 340px tools column                                    | bottom bar: Folder, Sort                 |

- **Project card** (new component, `components/ProjectCard/README.md`): a Tray with the mosaic's thumbnail, its
  title in `subtitle1`, then `32 × 32 bricks · Saved 3 Nov` in `body2` `muted`. Tapping the thumbnail or title
  opens it on Bricks. Two small text buttons below: _Duplicate_ and _Delete_. Delete removes the file and a Toast
  offers Undo, matching "Destructive: text, with confirmation or undo". The open project shows the one selected
  state (`azureWash`, `azure` border).
- **Renaming** happens where the title lives today, the Card text group on Cards. The file name follows the title.
  No second rename control.
- **Folder** group: a ChoiceRow, _This browser_ / _A folder_, with _Choose folder…_ as a small text button under
  it once you pick folder. The help line follows the rule (you can't see where files go, so it gets one line) and
  changes with the choice and with what the browser has granted (see "Keeping a browser library safe"):
  - This browser, storage persisted: "Your browser keeps these until you clear its site data. Back up all saves
    a copy."
  - This browser, not persisted: "Your browser can clear these when it runs short of space. Back up all saves a
    copy."
  - This browser, on iPhone or iPad and not installed: "Safari clears these after 7 days unused. Add the app to
    your Home Screen to keep them."
  - A folder: "Saved in Mosaics on this computer. Put the folder inside Google Drive or OneDrive to sync it."
  - Without folder support, the folder option doesn't show, and the line stays the browser one.
- _Back up all_ is a small text button under the Folder ChoiceRow while the library is in the browser.
- **Sort** group: a ChoiceRow, _Recent_ / _Name_.
- **Empty state** (no projects yet): heading "No mosaics yet", lead "Start with a picture and the app saves your
  mosaic here as you go.", button _New mosaic_, tip "Have a .mosaic.zip? Open it from ☰." Unlike other steps' empty
  states, this one keeps the tools: Folder is where you'd point the app at a folder of zips you already have.
- **Folder needs permission again** (a later visit, permission back at "prompt"): the canvas shows an EmptyState
  card instead of the grid, heading "Open Mosaics again", lead "Your browser needs your OK to read the folder.",
  button _Allow access_ (the browser only asks after a click). Chrome's "Allow on every visit" stops this
  happening after the first time.
- **New mosaic** resets the settings to defaults, clears the image and goes to Image. The new project joins the
  library when it first gets an image.

All copy above went through stop-slop; run it again on the final strings in the PR.

## How it works

### Storage interface (`src/library/`)

```ts
interface ProjectEntry { id: string; title: string; savedAt: string; bricks: [number, number]; size: number; thumbnail: Blob | null }
interface ProjectStore {
    list(): Promise<ProjectEntry[]>;
    read(id: string): Promise<Uint8Array>;      // the .mosaic.zip bytes
    write(id: string, zip: Uint8Array, entry: ProjectEntry): Promise<void>;
    remove(id: string): Promise<void>;
}
```

- **BrowserStore:** IndexedDB, a new `projects` store beside `images` (bump the DB version; the upgrade adds it).
  Calls `navigator.storage.persist()` once, so the browser is less likely to evict it.
- **FolderStore:** a `FileSystemDirectoryHandle` kept in IndexedDB. `list()` reads every `*.mosaic.zip` at the
  top of the folder (not subfolders), and caches each entry by name, size and `lastModified`, so a folder of 50
  projects doesn't unzip 50 files on every visit. The file name is the id: `projectFileName(title)`, with ` (2)`
  added when the name's taken.
- **Files changed outside the app** (a sync app, another tab): before writing, compare the file's `lastModified`
  with the time it was read. If it's newer, write the save as a new file and say so in a Toast, so neither copy is
  lost.

### Changes to the project file

- `project.json` gets an `id` (a UUID) at the top level, beside `app` and `version`. Optional: older files without
  one get an id the first time they're saved. `sanitizeSettings` doesn't change; the version stays 1.
- A new optional `thumbnail.png` in the zip (the mosaic at about 256px on its long side, with brick seams), so the
  grid shows mosaics without rebuilding each one. Files without it show a plain `tray` tile until next saved.

### Autosave and what replaces "remember the last one"

- `useMosaic` keeps the current project's id. A debounced effect (2s after the last change to settings, image or
  touch-ups) packs and writes it. Touch-up undo history stays unsaved, as now.
- localStorage keeps only the id of the open project. The `images/last` key and the settings key go away after
  migration.
- **Migration on first run:** if the old settings or `last` image exist, they become the first project in the
  browser library, then the old keys are deleted.
- ☰ changes: _Open project or template…_ imports the file into the library and opens it; given a backup zip,
  it restores every project in it. _Save project_ becomes
  _Download project_. _Forget image_ becomes _Delete this project_ (with Undo). Update the ☰ list in the README's
  Actions table to match.

### Keeping a browser library safe

A browser library can go five ways: the browser evicts it for space; Safari clears a site unused for 7 days of
browsing (Home Screen apps are exempt); the user clears site data or removes the app from the Home Screen; a
private window closes; or an autosave bug writes a broken project over a good one. The app can't stop the third
or fourth, so the aim is that a lost library is never the only copy.

- **Persistent storage.** Call `navigator.storage.persist()` when the first project is saved, and read
  `navigator.storage.persisted()` on each visit for the Folder help line. Chrome decides without asking and grants
  it readily to installed apps; Firefox asks the user; Safari supports it.
- **Install on iPhone and iPad.** That lifts Safari's 7-day rule. The help line says so while the library is in
  the browser and the app isn't installed, with the same wording ☰ → _Install app_ uses there.
- **Back up all.** Downloads one zip, `Mosaic Creator backup 2026-11-21.zip`, holding every project's
  `.mosaic.zip` and a `backup.json` (`app`, `version`, `savedAt`, project count). Opening it from ☰ restores each
  project; one whose id is already in the library and is newer there is skipped, and the Toast says how many came
  back and how many were skipped. Pack with fflate, PNGs stored without recompressing, as `packProject` does.
- **Backup reminder** (PR 2). Store when the last backup happened and count projects saved since. At 5 changed
  projects or 14 days, whichever comes first, a Toast that waits: "7 mosaics changed since your last backup." with
  _Back up_. Only while the library is in the browser; at most once per visit.
- **Suggest a folder** (PR 2). Where the browser supports folders, once there are 3 projects in the browser, a
  one-time Toast: "Keep your mosaics as files you can see and sync." with _Choose folder…_.
- **Keep the previous save.** Each project keeps one earlier version (a `previous` record in BrowserStore, a
  `.previous.mosaic.zip` beside the file in FolderStore, hidden from the grid). Before any write, unpack the new zip
  to check it; if that fails, don't write and show the error. When a project won't open, the card offers _Open the
  previous save_.

Two things stay out of reach: a private window can't be detected reliably, and once the browser clears the
library it clears the app's other stored data with it, so the app can't tell you it happened afterwards.

## Design system changes, in the same PRs

- `README.md`: the Projects row in "The steps" table; a short "Projects" section under Layout (tab not step,
  opens first when there are projects); the ☰ list; "Without an image, every step shows Image" gains "except
  Projects"; Installing and offline gets a line on where projects are kept.
- `components/StepTabs/README.md`: the unnumbered Projects tab, its icon (`FolderOutlined`) in the 22px circle's
  place.
- `components/ProjectCard/README.md`: new.
- `tokens.json` first, then `theme.ts`: a `project-card` minimum width for the grid (about 220px) and a thumbnail
  size, if no existing token fits.
- `Refinements.md`: add anything left out of these PRs.
- Republish the design system artifact with the changed `project/` files.

## PRs

1. **Library in the browser.** `ProjectStore`, `BrowserStore`, the `id` and thumbnail in the zip, autosave,
   migration, the Projects tab, ProjectCard, Sort, the ☰ changes, the design docs. From "Keeping a browser
   library safe": persistent storage, the install line, _Back up all_ and restore, and the previous save. A useful
   release on its own, in every browser, and safe to rely on without the folder.
2. **Folder.** `FolderStore`, the Folder group, choosing and changing the folder (offer to copy the browser
   library's projects into it), the permission card, the outside-change check, the backup reminder and the
   folder suggestion.

## Testing

- Unit tests for both stores against one shared suite: `fake-indexeddb` (already a dev dependency) for
  BrowserStore; for FolderStore, an in-memory fake of `FileSystemDirectoryHandle` in jsdom.
- App tests through Testing Library: open, duplicate, delete with Undo, autosave after a change, migration from
  the old keys, landing on Projects only when there are projects. Coverage stays at 80% or more.
- Safety: a backup round trip (back up, clear the store, restore, compare), restore skipping a newer copy, a
  write refused when the zip doesn't unpack, opening the previous save, each help line from mocked
  `persist`/`persisted` results and install state, and the reminder's 5-project and 14-day thresholds with fake
  timers.
- Playwright in Chrome at 1280 × 800 and 390 × 844, light and dark: the grid, the empty state, a long title, 30
  projects. For the folder, an init script replaces `showDirectoryPicker` with
  `navigator.storage.getDirectory()`, which gives a real directory handle without the system picker.
- A `frontend-design` pass on the grid and the card, then the README's "Checking a change" list.

## Open questions for later

- Search, once people have more than a screenful of projects.
- Templates in the library, as their own section.
- Direct Google Drive sync, for phones, where no sync app keeps a local folder. Left out by choice: it needs an
  OAuth client, the `drive.file` scope, Google's consent-screen review and a sign-in that expires hourly.
