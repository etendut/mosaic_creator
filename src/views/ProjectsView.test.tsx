import { act, render, screen, waitFor, within } from '@testing-library/react';
import { strFromU8, unzipSync } from 'fflate';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { browserStore } from '../library/browserStore';
import { readMeta, writeMeta } from '../library/meta';
import { OLD_SETTINGS_KEY } from '../library/migrate';
import { DEFAULT_PROJECT, packBackup, packProject, unpackProject } from '../mosaic/project';
import { rememberImage } from '../lib/imageStore';
import { applyImage, chooseImage, goTo, info, renderApp, seedProject, startMosaic, type User } from '../test/app';
import { fakeFolder } from '../test/fakeFolder';
import { downloads, FAKE_PNG } from '../test/fakes';

// a real folder handle can be stored in IndexedDB; the fake one (it holds functions) can't, so a test that starts
// with a folder chosen on an earlier visit hands it over here instead
vi.mock('../library/meta', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../library/meta')>();
    return { ...actual, readMeta: vi.fn(actual.readMeta) };
});

/** The Mosaics link in the editor's app bar: the word on desktop (the icon alone on a phone is hidden there). */
const mosaicsLink = () => screen.getAllByRole('link', { name: /Mosaics/ })[0];
const cards = () => within(screen.getByRole('list', { name: 'Mosaics' })).getAllByRole('listitem');
const card = (name: string) => screen.getByRole('listitem', { name });
const cardNames = () => cards().map((c) => c.getAttribute('aria-label'));
const savedNames = async () => (await browserStore.list()).map((p) => p.name).sort();

/** Seed projects from an earlier visit, newest first, then open the app on Mosaics. */
const openMosaicsWith = async (...names: string[]) => {
    for (const [i, name] of names.entries())
        await seedProject({}, { id: `p${i}`, name, savedAt: new Date(2026, 10, 20 - i) });
    localStorage.clear();
    window.history.replaceState(null, '', '#/mosaics');
    const user = renderApp();
    await screen.findByRole('listitem', { name: names[0] });
    return user;
};

const open = async (user: User, name: string) => {
    // found, not got: a dialog closing still hides the page for a moment
    await user.click(within(await screen.findByRole('listitem', { name })).getByRole('link'));
    return screen.findByRole('button', { name: `${name}, rename` });
};

describe('Mosaics: the library', () => {
    it('opens a first visit on Image, and saves the mosaic, named after its picture, once it has one', async () => {
        const user = renderApp();
        expect(await screen.findByText('Start with a picture')).toBeVisible();
        expect(await savedNames()).toEqual([]);
        await chooseImage(user, 'beach_day.png');
        await applyImage(user);
        expect(await screen.findByRole('button', { name: 'Beach day, rename' })).toBeInTheDocument();
        await waitFor(async () => expect(await savedNames()).toEqual(['Beach day']));

        await user.click(mosaicsLink());
        expect(cards()[0]).toHaveAccessibleName('Beach day');
        expect(cards()[0]).toHaveAttribute('aria-current', 'true');
        expect(info('Mosaics')).toBe('1');
        expect(info('Backed up')).toBe('Never');
    });

    it('goes to Mosaics and back to the open project with the link and the back button', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        await user.click(mosaicsLink());
        expect(window.location.hash).toBe('#/mosaics');
        expect(screen.getByRole('heading', { name: 'Mosaics', level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Bricks' })).not.toBeInTheDocument();

        act(() => window.history.back());
        expect(await screen.findByRole('heading', { name: 'Cards', level: 1 })).toBeInTheDocument();
    });

    it('opens on the project you had open last, at its step', async () => {
        await seedProject({}, { name: 'Fox', step: 'cards' });
        render(<App />, { wrapper: AppProviders });
        expect(await screen.findByRole('heading', { name: 'Cards', level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Fox, rename' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/seeded/cards');
    });

    it('opens on Mosaics when there are projects but none was open last', async () => {
        await seedProject({}, { name: 'Fox' });
        localStorage.clear();
        render(<App />, { wrapper: AppProviders });
        expect(await screen.findByRole('heading', { name: 'Mosaics', level: 1 })).toBeInTheDocument();
    });

    it("goes to Mosaics for a project that isn't there any more", async () => {
        window.history.replaceState(null, '', '#/gone/bricks');
        render(<App />, { wrapper: AppProviders });
        expect(await screen.findByRole('heading', { name: 'Mosaics', level: 1 })).toBeInTheDocument();
    });

    it('opens a project from its card, with its settings and name', async () => {
        await seedProject(
            { card: { ...DEFAULT_PROJECT.card, title: 'Library Day' } },
            { id: 'fox', name: 'Fox', savedAt: new Date(2026, 10, 1) },
        );
        const user = await openMosaicsWith('Balloon');
        await open(user, 'Fox');
        expect(await screen.findByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/fox/bricks');
        await goTo(user, 'Cards');
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Library Day');
    });

    it('saves the open project before opening another, and keeps each its own', async () => {
        const user = await openMosaicsWith('Balloon', 'Fox');
        await open(user, 'Balloon');
        await goTo(user, 'Cards');
        await user.clear(screen.getByRole('textbox', { name: 'Title' }));
        await user.click(screen.getByRole('textbox', { name: 'Title' }));
        await user.paste('Balloon day');
        await user.click(mosaicsLink());
        await open(user, 'Fox');
        await goTo(user, 'Cards');
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(DEFAULT_PROJECT.card.title);
        expect(unpackProject(await browserStore.read('p0')).settings.card.title).toBe('Balloon day');
    });

    it('sorts by name or by date, keeping the open project first', async () => {
        const user = await openMosaicsWith('Grandad', 'Club logo', 'Balloon');
        expect(cardNames()).toEqual(['Grandad', 'Club logo', 'Balloon']);
        await user.click(screen.getAllByRole('button', { name: 'Name' })[0]);
        expect(cardNames()).toEqual(['Balloon', 'Club logo', 'Grandad']);

        await open(user, 'Grandad');
        await user.click(mosaicsLink());
        expect(cardNames()[0]).toBe('Grandad');
        expect(card('Grandad')).toHaveAttribute('aria-current', 'true');
    });

    it('duplicates a project next to it, and deletes one with Undo', async () => {
        const user = await openMosaicsWith('Balloon', 'Fox');
        await user.click(screen.getByRole('button', { name: 'Duplicate Balloon' }));
        expect(await screen.findByRole('listitem', { name: 'Balloon (2)' })).toBeInTheDocument();
        expect(await savedNames()).toEqual(['Balloon', 'Balloon (2)', 'Fox']);

        await user.click(screen.getByRole('button', { name: 'Delete Fox' }));
        expect(await screen.findByText('Deleted Fox.')).toBeInTheDocument();
        expect(screen.queryByRole('listitem', { name: 'Fox' })).not.toBeInTheDocument();
        expect(await savedNames()).toEqual(['Balloon', 'Balloon (2)']);
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(await screen.findByRole('listitem', { name: 'Fox' })).toBeInTheDocument();
        expect(await savedNames()).toEqual(['Balloon', 'Balloon (2)', 'Fox']);
    });

    it('closes the open project when you delete it', async () => {
        const user = await openMosaicsWith('Balloon', 'Fox');
        await open(user, 'Fox');
        await user.click(mosaicsLink());
        await user.click(screen.getByRole('button', { name: 'Delete Fox' }));
        await waitFor(() => expect(cardNames()).toEqual(['Balloon']));
        expect(card('Balloon')).not.toHaveAttribute('aria-current');
    });

    it('renames the open project from the app bar, and saves the name', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Photo, rename' }));
        await user.clear(screen.getByRole('textbox', { name: 'Project name' }));
        await user.type(screen.getByRole('textbox', { name: 'Project name' }), 'Red balloon{Enter}');
        expect(screen.getByRole('button', { name: 'Red balloon, rename' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Red balloon, rename' }));
        await user.type(screen.getByRole('textbox', { name: 'Project name' }), 'Nope{Escape}');
        expect(screen.getByRole('button', { name: 'Red balloon, rename' })).toBeInTheDocument();
        await waitFor(async () => expect(await savedNames()).toEqual(['Red balloon']));
    });

    it('starts a new mosaic on Image from the defaults, and lists it once it has a picture', async () => {
        const user = await openMosaicsWith('Balloon');
        await user.click(screen.getAllByRole('button', { name: 'New mosaic' })[0]);
        expect(await screen.findByText('Start with a picture')).toBeVisible();
        expect(screen.getByRole('button', { name: 'New mosaic, rename' })).toBeInTheDocument();
        await user.click(mosaicsLink());
        expect(cardNames()).toEqual(['Balloon']);

        act(() => window.history.back());
        await chooseImage(user, 'fox.png');
        await applyImage(user);
        expect(await screen.findByRole('button', { name: 'Fox, rename' })).toBeInTheDocument();
        await waitFor(async () => expect(await savedNames()).toEqual(['Balloon', 'Fox']));
    });

    it('says how to start when there are no mosaics', async () => {
        const user = await openMosaicsWith('Balloon');
        await user.click(screen.getByRole('button', { name: 'Delete Balloon' }));
        expect(await screen.findByText('No mosaics yet')).toBeInTheDocument();
        const empty = screen.getByText('No mosaics yet').parentElement!;
        await user.click(within(empty).getByRole('button', { name: 'New mosaic' }));
        expect(await screen.findByText('Start with a picture')).toBeVisible();
    });

    it('moves the mosaic the app remembered before the library into it, named by its card title', async () => {
        await rememberImage(document.createElement('canvas'));
        localStorage.setItem(
            OLD_SETTINGS_KEY,
            JSON.stringify({ ...DEFAULT_PROJECT, card: { ...DEFAULT_PROJECT.card, title: 'Library Day' } }),
        );
        render(<App />, { wrapper: AppProviders });
        expect(await screen.findByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Library Day, rename' })).toBeInTheDocument();
        expect(await savedNames()).toEqual(['Library Day']);
        expect(localStorage.getItem(OLD_SETTINGS_KEY)).toBeNull();
    });
});

describe('Mosaics: backups and files', () => {
    it('backs up every mosaic in one zip, and says when in the Info bar', async () => {
        const user = await openMosaicsWith('Balloon', 'Fox');
        await user.click(screen.getByRole('button', { name: 'Back up all' }));
        expect(await screen.findByText(/Backed up 2 mosaics in one zip/)).toBeInTheDocument();
        const download = downloads.at(-1)!;
        expect(download.name).toMatch(/^Mosaic Creator backup \d{4}-\d{2}-\d{2}\.zip$/);
        const files = unzipSync(new Uint8Array(await download.blob.arrayBuffer()));
        expect(Object.keys(files).sort()).toEqual(['Balloon.mosaic.zip', 'Fox.mosaic.zip', 'backup.json']);
        expect(JSON.parse(strFromU8(files['backup.json'])).projects).toBe(2);
        expect(info('Backed up')).toBe('Today');
    });

    it('restores a backup from Open file…, skipping mosaics you have newer copies of', async () => {
        const older = packProject({
            settings: DEFAULT_PROJECT,
            image: FAKE_PNG,
            meta: { id: 'p0', name: 'Balloon', savedAt: new Date(2020, 0, 1).toISOString() },
        });
        const gone = packProject({
            settings: DEFAULT_PROJECT,
            image: FAKE_PNG,
            meta: { id: 'old-fox', name: 'Fox', savedAt: new Date(2026, 0, 1).toISOString() },
        });
        const backup = packBackup([
            { fileName: 'Balloon.mosaic.zip', zip: older },
            { fileName: 'Fox.mosaic.zip', zip: gone },
        ]);
        const user = await openMosaicsWith('Balloon');
        await user.click(screen.getByRole('button', { name: 'Open file…' }));
        await user.upload(screen.getByTestId('project-file'), new File([backup as BlobPart], 'backup.zip'));
        expect(
            await screen.findByText('Restored 1 mosaic. Skipped 1 mosaic you have newer copies of.'),
        ).toBeInTheDocument();
        await waitFor(() => expect([...cardNames()].sort()).toEqual(['Balloon', 'Fox']));
    });

    it('opens a project file as a new mosaic when one with its id is already here', async () => {
        const user = await openMosaicsWith('Balloon');
        const copy = await browserStore.read('p0');
        await user.click(screen.getByRole('button', { name: 'Open file…' }));
        await user.upload(screen.getByTestId('project-file'), new File([copy as BlobPart], 'Balloon.mosaic.zip'));
        expect(await screen.findByRole('button', { name: 'Balloon (2), rename' })).toBeInTheDocument();
        expect(await savedNames()).toEqual(['Balloon', 'Balloon (2)']);
    });

    it("offers the previous save when a mosaic's file won't open", async () => {
        await seedProject({ card: { ...DEFAULT_PROJECT.card, title: 'Good' } }, { id: 'p0', name: 'Balloon' });
        // a broken save over it: the good one becomes the previous save
        await browserStore.write(
            { id: 'p0', name: 'Balloon', savedAt: new Date(), bricks: null, size: 3, thumbnail: null },
            new Uint8Array([1, 2, 3]),
        );
        localStorage.clear();
        const user = renderApp();
        await user.click(within(await screen.findByRole('listitem', { name: 'Balloon' })).getByRole('link'));
        expect(await screen.findByText(/That mosaic's file won't open/)).toBeInTheDocument();
        expect(within(card('Balloon')).getByText("This file won't open.")).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Open the previous save of Balloon' }));
        expect(await screen.findByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
        await goTo(user, 'Cards');
        expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Good');
    });

    it('reminds you to back up once five mosaics changed, and not again after you close it', async () => {
        await writeMeta({ changedSinceBackup: ['a', 'b', 'c', 'd', 'e'], changedSince: new Date().toISOString() });
        const user = await openMosaicsWith('Balloon');
        expect(await screen.findByText('5 mosaics changed since your last backup.')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText(/since your last backup/)).not.toBeInTheDocument();
        await waitFor(async () => expect((await readMeta()).backupPromptClosedAt).toBe(5));
    });
});

describe('Mosaics: keeping them in a folder', () => {
    const withFolderPicker = (folder: ReturnType<typeof fakeFolder>['folder'] | null) => {
        Object.defineProperty(window, 'showDirectoryPicker', {
            configurable: true,
            value: async () => {
                if (!folder) throw new DOMException('Cancelled', 'AbortError');
                return folder;
            },
        });
    };
    afterEach(() => {
        delete (window as { showDirectoryPicker?: unknown }).showDirectoryPicker;
    });

    it("says the browser keeps them, with no folder choice where the browser can't keep them in one", async () => {
        await openMosaicsWith('Balloon');
        expect(screen.queryByRole('button', { name: 'Use a folder…' })).not.toBeInTheDocument();
        expect(screen.getByText(/Your browser (can clear|keeps) these/)).toBeInTheDocument();
    });

    it('moves to a folder, copying in the mosaics the browser keeps, and saves there from then on', async () => {
        const f = fakeFolder('Mosaics');
        withFolderPicker(f.folder);
        const user = await openMosaicsWith('Balloon', 'Fox');
        await user.click(screen.getByRole('button', { name: 'Use a folder…' }));
        const dialog = await screen.findByRole('dialog', { name: 'Copy your mosaics into Mosaics?' });
        await user.click(within(dialog).getByRole('button', { name: 'Copy 2 mosaics' }));
        expect(await screen.findByText('Copied 2 mosaics into Mosaics.')).toBeInTheDocument();
        expect(f.names()).toEqual(['Balloon.mosaic.zip', 'Fox.mosaic.zip']);
        // the folder shows as where your mosaics are, with one way to change it; the browser isn't a choice any more
        expect(screen.getByText('Mosaics', { selector: 'p' })).toBeInTheDocument();
        expect(screen.getByText(/You'll find each mosaic here/)).toBeInTheDocument();
        // (the copy dialog closes first, so wait for the page behind it)
        expect(await screen.findByRole('button', { name: 'Change folder…' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'This browser' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Back up all' })).not.toBeInTheDocument();
        expect(screen.queryByText('Backed up')).not.toBeInTheDocument();

        // saves go to the folder now
        await open(user, 'Fox');
        await user.click(screen.getByRole('button', { name: 'Fox, rename' }));
        await user.clear(screen.getByRole('textbox', { name: 'Project name' }));
        await user.type(screen.getByRole('textbox', { name: 'Project name' }), 'Red fox{Enter}');
        await waitFor(() => expect(f.names()).toContain('Red fox.mosaic.zip'));
    });

    it('stays in the browser when you cancel choosing a folder', async () => {
        withFolderPicker(null);
        const user = await openMosaicsWith('Balloon');
        await user.click(screen.getByRole('button', { name: 'Use a folder…' }));
        expect(screen.getByRole('button', { name: 'Use a folder…' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back up all' })).toBeInTheDocument();
    });

    it("changes folder without offering to copy the browser's mosaics in again", async () => {
        const first = fakeFolder('Mosaics');
        withFolderPicker(first.folder);
        const user = await openMosaicsWith('Balloon');
        await user.click(screen.getByRole('button', { name: 'Use a folder…' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Copy 1 mosaic' }));
        await screen.findByText('Copied 1 mosaic into Mosaics.');

        withFolderPicker(fakeFolder('Club mosaics').folder);
        await user.click(await screen.findByRole('button', { name: 'Change folder…' }));
        expect(await screen.findByText('Club mosaics', { selector: 'p' })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('stops using the folder after asking, copying its mosaics into the browser and leaving the files', async () => {
        const f = fakeFolder('Mosaics');
        withFolderPicker(f.folder);
        const user = await openMosaicsWith('Balloon');
        await user.click(screen.getByRole('button', { name: 'Use a folder…' }));
        await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Not now' }));
        f.put('Fox.mosaic.zip', packProject({ settings: DEFAULT_PROJECT, image: FAKE_PNG, meta: { name: 'Fox' } }));

        // asks first, and Cancel keeps the folder
        await user.click(await screen.findByRole('button', { name: 'Stop using this folder' }));
        const ask = await screen.findByRole('dialog', { name: 'Stop using Mosaics?' });
        await user.click(within(ask).getByRole('button', { name: 'Cancel' }));
        expect(await screen.findByRole('button', { name: 'Change folder…' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Stop using this folder' }));
        const confirm = await screen.findByRole('dialog', { name: 'Stop using Mosaics?' });
        await user.click(within(confirm).getByRole('button', { name: 'Stop using folder' }));
        expect(await screen.findByText(/^Copied 1 mosaic from Mosaics\./)).toBeInTheDocument();
        expect(await screen.findByRole('button', { name: 'Use a folder…' })).toBeInTheDocument();
        expect(screen.getByRole('listitem', { name: 'Fox' })).toBeInTheDocument();
        expect(f.names()).toContain('Fox.mosaic.zip');
    });

    it('asks again for the folder when the browser needs your OK, then lists it', async () => {
        const f = fakeFolder('Mosaics', { permission: 'prompt' });
        f.put('Fox.mosaic.zip', packProject({ settings: DEFAULT_PROJECT, image: FAKE_PNG, meta: { name: 'Fox' } }));
        const earlier = await readMeta();
        vi.mocked(readMeta).mockResolvedValueOnce({ ...earlier, storage: 'folder', folder: f.folder, migrated: true });
        window.history.replaceState(null, '', '#/mosaics');
        const user = renderApp();
        expect(await screen.findByText('Open Mosaics again')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Allow access' }));
        expect(await screen.findByRole('listitem', { name: 'Fox' })).toBeInTheDocument();
        expect(f.state.requested).toBe(1);
    });
});
