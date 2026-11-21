# Mosaics: a library of mosaics, and an editor for one

The app gets two views. **Mosaics** lists every mosaic you've made, starts a new one and opens one. the **editor** is
today's app: the six steps, editing the open project, with its name in the app bar. Projects live as ordinary
`.mosaic.zip` files, in the browser or in a folder you choose. There's no cloud service: if the folder sits inside
Google Drive, OneDrive or Dropbox on your computer, their sync apps copy it, and the app never talks to them.

## Where it stands today

- A project is already one self-contained file: `packProject` / `unpackProject` in `src/mosaic/project.ts` write
  and read a zip of `project.json`, `image.png` and the BrickLink wanted list. The library stores these zips
  unchanged, so a file in the folder is the same file ☰ → Save project downloads today.
- The browser remembers one project only: the settings in localStorage (`useMosaic.ts`, `mosaic-creator:settings`)
  and the last image in IndexedDB (`src/lib/imageStore.ts`, key `last`).
- The project has no name of its own. `card.title` (default "Mosaic Creator") is printed on the cards and also
  names the downloaded file.
- Steps live in `STEPS` in `src/app/App.tsx` and the URL hash (`useStepRoute`). Without an image, every step
  shows Image.

## Two views

| View    | URL                     | App bar                                                           | Holds                                |
| ------- | ----------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| Mosaics | `#/mosaics`             | ☰, "Mosaics", main action _New mosaic_, secondary _Open file…_   | the library: a grid of project cards |
| Editor  | `#/<project id>/<step>` | ☰, _Mosaics_ link, the project's name, ① to ⑥, the step's action | one project, through the six steps   |

- **Getting between them.** In the editor, a _Mosaics_ link sits left of the name, so the app bar reads "Mosaics /
  Balloon" like a short trail. On a phone the first row holds ☰, the link as an icon (`Collections`, labelled
  "Mosaics"), the name (cut short with an ellipsis) and the step's action; the step tabs keep the second row.
  Opening a card in Mosaics goes to that project on Bricks (on Image if it has no picture yet). The browser's
  back and forward move between the views, as they move between steps now.
- **Where the app opens.** With no projects: the editor on Image, as now, so a first visit never lands on an empty
  library. With projects: the project that was open last, at its last step. The _Mosaics_ link is one click
  away.
- **The name.** Each project gets a `name` of its own, apart from the card title. You rename it by clicking the
  name in the editor's app bar: it turns into a text field, and Enter or leaving the field saves it. A new project
  takes its name from the image's file name ("balloon.jpg" becomes "Balloon"); one with no image yet is "New
  mosaic". The card title starts as the name and stays editable on Cards, so the cards can say "Library Day 2026"
  while the project is called "Balloon". The file name follows the project name.

## Decisions to confirm

1. **A browser library where folders aren't available.** `showDirectoryPicker()` exists in Chromium on desktop and
   recent Chrome for Android, not in Firefox or on iPhone and iPad. Folder-only would leave those users with no
   library, and would remove the "remembers your last mosaic" behaviour they have now. Recommendation: every
   browser gets a library in IndexedDB; where the browser can, _Choose folder…_ moves it into a folder. One
   storage interface, two backends.
2. **Saving happens automatically.** The app already keeps your current mosaic without asking; the library
   extends that to every mosaic. The open project saves itself about two seconds after your last change. The
   alternative, an explicit Save, adds an unsaved state and a "leave without saving?" prompt the app doesn't have
   today.
3. **Opening on the last project, with projects in the library** (above). The alternative is opening on Mosaics
   each visit, which costs a click for the common case of carrying on with one mosaic.
4. **Actions on every card, or only on the open one.** Each card's _Duplicate_ and _Delete_ make 60 buttons in a
   grid of 30. Recommendation: every card shows them, as two small text buttons in `muted` that turn `azure` on
   hover and focus, so the grid reads as pictures first. Hiding them behind a ⋮ menu goes against "show, don't
   hide".
5. **Templates stay out of the library for now.** Files ending ` template.mosaic.zip` are ignored in the folder;
   the editor's ☰ → _Save as template_ keeps downloading them.

## The Mosaics view

Checked against `docs/design-system/README.md`, with the new conventions this branch adds (Two views, Collection
pages, Saving, Prompts, Dates and sizes).

| Zone     | Desktop                                                          | Phone                                           |
| -------- | ---------------------------------------------------------------- | ----------------------------------------------- |
| App bar  | ☰, "Mosaics", _Open file…_ (outlined), _New mosaic_ (contained) | ☰, "Mosaics", _New mosaic_; _Open file…_ in ☰ |
| Info bar | Mosaics 7 · Space 18 MB · Backed up 3 Nov                        | same band                                       |
| Canvas   | a grid of project cards in the Stage, the open one first         | one column of cards, full width                 |
| Tools    | Storage, Sort, in the 340px tools column                         | bottom bar: Storage, Sort                       |

- **Info bar.** _Backed up_ shows the last backup's date, or "Never", while the library is in the browser; in a
  folder it goes, since the folder is the copy. A sum of bricks across unrelated mosaics helps nobody plan, so
  it's left out.
- **Project card** (new component, `components/ProjectCard/README.md`): a Tray with the mosaic's thumbnail, the
  name in `subtitle1`, and "32 × 32 bricks, saved 3 Nov" in `body2` `muted`. The thumbnail and name open it. Under
  them, _Duplicate_ and _Delete_. Delete removes the file and a Toast offers Undo. The open project is _current_:
  an `azure` ring outside a `tray` gap and `aria-current`, as on the ColorSwatch, not the selected state of a
  toggle.
- **Storage** group: a ChoiceRow, _This browser_ / _A folder_, with _Choose folder…_ as a small text button under
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
- _Back up all_ is a small text button under the Storage ChoiceRow while the library is in the browser.
- **Sort** group: a ChoiceRow, _Recent_ / _Name_.
- **Loading.** While a folder's projects are read, each card shows as a plain `tray` tile of its final size, the
  same tile a project without a thumbnail shows. No spinner, no shimmer.
- **Empty** (you deleted the last one, or a new folder holds none): heading "No mosaics yet", lead "Start with a picture. You'll find your mosaic here, saved as you go.", button _New mosaic_, tip "Have a .mosaic.zip? Open it with
  Open file…". The tools stay, as the Collection pages convention allows: Storage is where you'd point the app at
  a folder of zips you already have.
- **Folder needs permission again** (a later visit, permission back at "prompt"): the canvas shows a blocked
  EmptyState instead of the grid: heading "Open Mosaics again", lead "Your browser needs your OK to read the
  folder.", button _Allow access_ (the browser only asks after a click), no tip. Chrome's "Allow on every visit"
  stops this after the first time.

## The editor view

- Unchanged apart from the app bar (the _Mosaics_ link and the name) and ☰.
- **☰ in the editor:** _Download project_ (a copy to send or keep), _Save as template_, then the app items.
- **☰ in Mosaics:** _Open file…_ on a phone (on desktop it's beside _New mosaic_), then the app items.
- **App items, in both:** _Show me around_, _Install app_, Theme, About.
- Gone from ☰: _Open project or template…_ (now _Open file…_ in Mosaics), _Save project_ (it saves itself),
  _Reset to defaults_ (a new mosaic starts from the defaults), _Forget image_ (delete the project from its card).
  Each action now lives in one place.
- **Walkthrough:** stop 8 points at the _Mosaics_ link instead of ☰: "Open Mosaics to find every mosaic you've made, saved as you work."

All copy above went through stop-slop; run it again on the final strings in the PR.

## How it works

### Storage interface (`src/library/`)

```ts
interface ProjectEntry {
  id: string;
  name: string;
  savedAt: string;
  bricks: [number, number];
  size: number;
  thumbnail: Blob | null;
}
interface ProjectStore {
  list(): Promise<ProjectEntry[]>;
  read(id: string): Promise<Uint8Array>; // the .mosaic.zip bytes
  write(id: string, zip: Uint8Array, entry: ProjectEntry): Promise<void>;
  remove(id: string): Promise<void>;
}
```

- **BrowserStore:** IndexedDB, a new `projects` store beside `images` (bump the DB version; the upgrade adds it).
- **FolderStore:** a `FileSystemDirectoryHandle` kept in IndexedDB. `list()` reads every `*.mosaic.zip` at the
  top of the folder (not subfolders), and caches each entry by name, size and `lastModified`, so a folder of 50
  projects doesn't unzip 50 files on every visit. The file name comes from `projectFileName(name)`, with ` (2)`
  added when the name's taken; renaming renames the file.
- **Files changed outside the app** (a sync app, another tab): before writing, compare the file's `lastModified`
  with the time it was read. If it's newer, write the save as a new file and say so in a Toast, so neither copy is
  lost.

### Changes to the project file

- `project.json` gets an `id` (a UUID) and a `name` at the top level, beside `app` and `version`. Both optional:
  an older file gets an id the first time it's saved, and its name from its file name, or from `card.title` if
  that isn't the default. `sanitizeSettings` doesn't change; the version stays 1.
- A new optional `thumbnail.png` in the zip (the mosaic at about 256px on its long side, with brick seams), so the
  grid shows mosaics without rebuilding each one. Files without it show a plain `tray` tile until next saved.

### Autosave and what replaces "remember the last one"

- `useMosaic` keeps the open project's id. A debounced effect (2s after the last change to settings, image, name
  or touch-ups) packs and writes it. Touch-up undo history stays unsaved, as now.
- Nothing on screen says "Saved": by the Saving convention, a save you'd expect shows nothing. A save that fails
  shows an error Toast that waits, and the app tries again on the next change.
- localStorage keeps only the open project's id and step. The `images/last` key and the settings key go away after
  migration.
- **Migration on first run:** if the old settings or `last` image exist, they become the first project in the
  browser library, then the old keys are deleted.
- _Open file…_ imports the file into the library and opens it; given a backup zip, it restores every project in
  it and stays on Mosaics.

### Keeping a browser library safe

A browser library can go five ways: the browser evicts it for space; Safari clears a site unused for 7 days of
browsing (Home Screen apps are exempt); the user clears site data or removes the app from the Home Screen; a
private window closes; or an autosave bug writes a broken project over a good one. The app can't stop the third
or fourth, so the aim is that a lost library is never the only copy.

- **Persistent storage.** Call `navigator.storage.persist()` when the first project is saved, and read
  `navigator.storage.persisted()` on each visit for the Storage help line. Chrome decides without asking and
  grants it readily to installed apps; Firefox asks the user; Safari supports it.
- **Install on iPhone and iPad.** That lifts Safari's 7-day rule. The help line says so while the library is in
  the browser and the app isn't installed, with the same wording ☰ → _Install app_ uses there.
- **Back up all.** Downloads one zip, `Mosaic Creator backup 2026-11-21.zip`, holding every project's
  `.mosaic.zip` and a `backup.json` (`app`, `version`, `savedAt`, project count). Opening it restores each
  project; one whose id is already in the library and is newer there is skipped, and the Toast says how many came
  back and how many were skipped. Pack with fflate, PNGs stored without recompressing, as `packProject` does.
- **Backup reminder** (PR 2). A prompt, so it follows the Prompts convention. Store when the last backup happened
  and count projects saved since. At 5 changed projects or 14 days, whichever comes first, on opening Mosaics: a
  Toast that waits, "7 mosaics changed since your last backup." with _Back up_. Only while the library is in the
  browser.
- **Suggest a folder** (PR 2). A prompt too. Where the browser supports folders, once there are 3 projects in the
  browser, on opening Mosaics: "Keep your mosaics as files you can see and sync." with _Choose folder…_. Closing
  it means no, for good.
- **Keep the previous save.** Each project keeps one earlier version (a `previous` record in BrowserStore, a
  `.previous.mosaic.zip` beside the file in FolderStore, hidden from the grid). Before any write, unpack the new zip
  to check it; if that fails, don't write and show the error. When a project won't open, its card offers _Open the
  previous save_.

Two things stay out of reach: the app can't reliably tell a private window, and once the browser clears the
library it clears the app's other stored data with it, so the app can't tell you it happened afterwards.

## Design system changes

Written in this branch, ahead of the code, so the conventions can be argued over first:

- `README.md`:
  - Two views (Layout)
  - Collection pages (Layout)
  - Saving (States and interaction)
  - Prompts (States and interaction)
  - Dates, sizes and names (Content fundamentals)
  - the Actions table's ☰ row, per view
  - the Mosaics view in "The steps"
- `components/ProjectCard/README.md`: new.
- `components/StepTabs/README.md`: the editor's app bar gains the _Mosaics_ link and the name.
- `components/EmptyState/README.md`: the blocked variant.
- `components/Toast/README.md`: prompts, and the waiting cases they add.
- `tokens.json`: `project-card` (220px), the narrowest a card gets in the grid.
- `Refinements.md`: the library, as the gap between the app and these conventions until it ships.

When the code lands: `theme.ts` gets the token, Refinements loses the item, and the artifact is republished.

## PRs

1. **Library in the browser.** `ProjectStore`, `BrowserStore`, `id`, `name` and thumbnail in the zip, autosave,
   migration, both views and the routes, ProjectCard, Sort, renaming, the ☰ changes. From "Keeping a browser
   library safe": persistent storage, the install line, _Back up all_ and restore, and the previous save. A useful
   release on its own, in every browser, and safe to rely on without the folder.
2. **Folder.** `FolderStore`, the Storage group's folder option, choosing and changing the folder (offer to copy
   the browser library's projects into it), the blocked state, the outside-change check, the backup reminder and
   the folder suggestion.

## Testing

- Unit tests for both stores against one shared suite: `fake-indexeddb` (already a dev dependency) for
  BrowserStore; for FolderStore, an in-memory fake of `FileSystemDirectoryHandle` in jsdom.
- App tests through Testing Library: open from a card, back to Mosaics, rename, duplicate, delete with Undo,
  autosave after a change, a failed save's Toast, migration from the old keys, opening on the last project or on
  Image with none, the routes and back button. Coverage stays at 80% or more.
- Safety: a backup round trip (back up, clear the store, restore, compare), restore skipping a newer copy, a
  write refused when the zip doesn't unpack, opening the previous save, each help line from mocked
  `persist`/`persisted` results and install state, and the reminder's thresholds with fake timers.
- Playwright in Chrome at 1280 × 800 and 390 × 844, light and dark: the grid, the empty and blocked states, a long
  name in both app bars, 30 projects. For the folder, an init script replaces `showDirectoryPicker` with
  `navigator.storage.getDirectory()`, which gives a real directory handle without the system picker.
- A `frontend-design` pass on the grid, the card and the editor's app bar, then the README's "Checking a change"
  list.

## Open questions for later

- Search, once people have more than a screenful of projects.
- Templates in the library, as their own section.
- Direct Google Drive sync, for phones, where no sync app keeps a local folder. Left out by choice: it needs an
  OAuth client, the `drive.file` scope, Google's consent-screen review and a sign-in that expires hourly.
