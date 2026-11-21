import { allValues, asBytes, getValue, resultOf, transact } from '../lib/db';
import type { ProjectEntry, ProjectStore } from './types';

/** An entry as IndexedDB holds it: the date as text, so it reads back the same in every browser. */
interface StoredEntry extends Omit<ProjectEntry, 'savedAt'> {
    savedAt: string;
}

const toStored = (entry: ProjectEntry): StoredEntry => ({ ...entry, savedAt: entry.savedAt.toISOString() });
const fromStored = (stored: StoredEntry): ProjectEntry => ({
    ...stored,
    savedAt: new Date(stored.savedAt),
    thumbnail: asBytes(stored.thumbnail),
});

/**
 * Projects kept in this browser's IndexedDB: each entry in `projects`, its zip in `zips`, and the save before the
 * latest in `previous`. A write is one transaction, so a project never ends up with an entry but no zip.
 */
export const browserStore: ProjectStore = {
    kind: 'browser',

    list: async () => (await allValues<StoredEntry>('projects')).map(fromStored),

    read: async (id) => {
        const zip = asBytes(await getValue('zips', id));
        if (!zip) throw new Error("That mosaic isn't in this browser any more.");
        return zip;
    },

    readPrevious: async (id) => asBytes(await getValue('previous', id)),

    write: async (entry, zip) => {
        await transact(['projects', 'zips', 'previous'], 'readwrite', (tx) => {
            const zips = tx.objectStore('zips');
            const old = zips.get(entry.id);
            // the save this one replaces becomes the previous one
            old.onsuccess = () => {
                if (old.result) tx.objectStore('previous').put(resultOf(old), entry.id);
                zips.put(zip, entry.id);
                tx.objectStore('projects').put(toStored(entry), entry.id);
            };
        });
        return {};
    },

    remove: (id) =>
        transact(['projects', 'zips', 'previous'], 'readwrite', (tx) => {
            for (const store of ['projects', 'zips', 'previous'] as const) tx.objectStore(store).delete(id);
        }),
};
