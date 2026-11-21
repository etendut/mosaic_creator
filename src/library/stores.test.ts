import { DEFAULT_PROJECT, packProject, unpackProject } from '../mosaic/project';
import { fakeFolder } from '../test/fakeFolder';
import { FAKE_PNG } from '../test/fakes';
import { browserStore } from './browserStore';
import { folderStore, isProjectFile, previousName } from './folderStore';
import { entryFromZip, freeName, type ProjectEntry, type ProjectStore } from './types';

const project = (id: string, name: string, title = name) => {
    const savedAt = new Date(2026, 10, 21);
    const zip = packProject({
        settings: { ...DEFAULT_PROJECT, card: { ...DEFAULT_PROJECT.card, title } },
        image: FAKE_PNG,
        thumbnail: FAKE_PNG,
        meta: { id, name, bricks: [32, 32], savedAt: savedAt.toISOString() },
    });
    const entry: ProjectEntry = { id, name, savedAt, bricks: [32, 32], size: zip.byteLength, thumbnail: FAKE_PNG };
    return { entry, zip };
};

const titleOf = (zip: Uint8Array) => unpackProject(zip).settings.card.title;

/** What both stores promise, run against each. */
const behavesAsAStore = (make: () => ProjectStore) => {
    it('lists, reads and removes what it keeps', async () => {
        const store = make();
        const balloon = project('a', 'Balloon');
        await store.write(balloon.entry, balloon.zip);
        const [listed] = await store.list();
        expect(listed).toMatchObject({ id: 'a', name: 'Balloon', bricks: [32, 32] });
        expect(listed.thumbnail).toEqual(FAKE_PNG);
        expect(await store.read('a')).toEqual(balloon.zip);
        await store.remove('a');
        expect(await store.list()).toEqual([]);
        await expect(store.read('a')).rejects.toThrow("isn't in");
    });

    it('keeps the save before the latest one', async () => {
        const store = make();
        expect(await store.readPrevious('a')).toBeNull();
        await store.write(project('a', 'Balloon', 'First').entry, project('a', 'Balloon', 'First').zip);
        await store.write(project('a', 'Balloon', 'Second').entry, project('a', 'Balloon', 'Second').zip);
        expect(titleOf(await store.read('a'))).toBe('Second');
        expect(titleOf((await store.readPrevious('a'))!)).toBe('First');
    });
};

describe('browserStore', () => {
    behavesAsAStore(() => browserStore);
});

describe('folderStore', () => {
    behavesAsAStore(() => folderStore(fakeFolder().folder));

    it('keeps each project as a .mosaic.zip named after it, with its previous save beside it', async () => {
        const f = fakeFolder();
        const store = folderStore(f.folder);
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        expect(f.names()).toEqual(['Balloon.mosaic.zip', 'Balloon.previous.mosaic.zip']);
    });

    it('renames the file with the project, and gives a taken name a number', async () => {
        const f = fakeFolder();
        const store = folderStore(f.folder);
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        await store.write(project('b', 'Fox').entry, project('b', 'Fox').zip);
        await store.write(project('b', 'Balloon').entry, project('b', 'Balloon').zip);
        // Fox's file went; its previous save went with it, and the save it replaced came along as Balloon (2)'s
        expect(f.names()).toEqual(['Balloon (2).mosaic.zip', 'Balloon (2).previous.mosaic.zip', 'Balloon.mosaic.zip']);
    });

    it('lists only projects: not previous saves, templates or other files', async () => {
        const f = fakeFolder();
        f.put('Fox.mosaic.zip', project('x', 'Fox').zip);
        f.put('Fox.previous.mosaic.zip', project('x', 'Fox').zip);
        f.put('Club template.mosaic.zip', packProject({ settings: DEFAULT_PROJECT, image: null }));
        f.put('notes.txt', new Uint8Array([1, 2, 3]));
        f.put('broken.mosaic.zip', new Uint8Array([1, 2, 3]));
        expect((await folderStore(f.folder).list()).map((p) => p.name)).toEqual(['Fox']);
    });

    it('names and dates a file that predates the library from the file itself', async () => {
        const f = fakeFolder();
        f.put('Old club day.mosaic.zip', packProject({ settings: DEFAULT_PROJECT, image: FAKE_PNG }));
        const [entry] = await folderStore(f.folder).list();
        expect(entry.name).toBe('Old club day');
        expect(entry.id).toMatch(/^f/);
        // the same id next visit, so a link to it keeps working
        expect((await folderStore(f.folder).list())[0].id).toBe(entry.id);
    });

    it('treats a copied file, with the same id inside, as its own project', async () => {
        const f = fakeFolder();
        f.put('Fox.mosaic.zip', project('x', 'Fox').zip);
        f.put('Fox copy.mosaic.zip', project('x', 'Fox').zip);
        const ids = (await folderStore(f.folder).list()).map((p) => p.id);
        expect(new Set(ids).size).toBe(2);
    });

    it('reads a file once, then from the cache until it changes', async () => {
        const f = fakeFolder();
        f.put('Fox.mosaic.zip', project('x', 'Fox').zip);
        await folderStore(f.folder).list();
        const read = vi.spyOn(File.prototype, 'arrayBuffer');
        await folderStore(f.folder).list();
        expect(read).not.toHaveBeenCalled();
        f.put('Fox.mosaic.zip', project('x', 'Fox', 'Changed').zip);
        await folderStore(f.folder).list();
        expect(read).toHaveBeenCalled();
        read.mockRestore();
    });

    it('never overwrites a file something else changed since it was read: the save goes to a new file', async () => {
        const f = fakeFolder();
        const store = folderStore(f.folder);
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        // a sync app brings in a newer copy from another computer
        f.put('Balloon.mosaic.zip', project('a', 'Balloon', 'From the laptop').zip);
        const result = await store.write(project('a', 'Balloon', 'Mine').entry, project('a', 'Balloon', 'Mine').zip);
        expect(result.movedTo).toBe('Balloon (2).mosaic.zip');
        expect(titleOf(await f.bytes('Balloon.mosaic.zip'))).toBe('From the laptop');
        expect(titleOf(await f.bytes('Balloon (2).mosaic.zip'))).toBe('Mine');
    });

    it('keeps a file name you gave it until the project is renamed', async () => {
        const f = fakeFolder();
        f.put('my balloon.mosaic.zip', project('a', 'Balloon').zip);
        const store = folderStore(f.folder);
        await store.list();
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        expect(f.names()).toContain('my balloon.mosaic.zip');
    });

    it('saves afresh a file that went from the folder', async () => {
        const f = fakeFolder();
        const store = folderStore(f.folder);
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        f.files.delete('Balloon.mosaic.zip');
        await store.write(project('a', 'Balloon').entry, project('a', 'Balloon').zip);
        expect(f.names()).toEqual(['Balloon.mosaic.zip']);
    });

    it('names its files', () => {
        expect(previousName('Fox.mosaic.zip')).toBe('Fox.previous.mosaic.zip');
        expect(isProjectFile('Fox.mosaic.zip')).toBe(true);
        expect(isProjectFile('Fox.previous.mosaic.zip')).toBe(false);
        expect(isProjectFile('Fox template.mosaic.zip')).toBe(false);
    });
});

describe('entries and names', () => {
    it('reads an entry from a zip, filling in what an older file lacks', () => {
        const old = packProject({ settings: DEFAULT_PROJECT, image: FAKE_PNG });
        const entry = entryFromZip(old, { name: 'Fox' });
        expect(entry.name).toBe('Fox');
        expect(entry.bricks).toBeNull();
        expect(entry.thumbnail).toBeNull();
        expect(entry.id).toBeTruthy();
    });

    it('numbers a taken name', () => {
        expect(freeName('Fox', ['Balloon'])).toBe('Fox');
        expect(freeName('Fox', ['Fox'])).toBe('Fox (2)');
        expect(freeName('Fox (2)', ['Fox', 'Fox (2)'])).toBe('Fox (3)');
    });
});
