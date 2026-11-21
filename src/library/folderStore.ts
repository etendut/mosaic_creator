import { allValues, asBytes, deleteValue, putValue, transact } from '../lib/db';
import { projectFileName } from '../mosaic/project';
import { entryFromZip, type ProjectEntry, type ProjectStore } from './types';

/*
 * The parts of the File System Access API the folder store uses. Declared here rather than taken from the DOM
 * library, which leaves out the permission calls and directory iteration, and so tests can supply a fake folder.
 */
export interface FolderFile {
    kind: 'file';
    name: string;
    getFile(): Promise<File>;
    createWritable(): Promise<{ write(data: BufferSource | Blob): Promise<void>; close(): Promise<void> }>;
}
export type PermissionState = 'granted' | 'denied' | 'prompt';
export interface FolderHandle {
    kind: 'directory';
    name: string;
    values(): AsyncIterable<FolderFile | { kind: 'directory'; name: string }>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FolderFile>;
    removeEntry(name: string): Promise<void>;
    queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
    requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>;
}

const ZIP = '.mosaic.zip';
const PREVIOUS = '.previous.mosaic.zip';
const TEMPLATE = ` template${ZIP}`;

/** The hidden copy of a file's previous save, beside it. */
export const previousName = (fileName: string) => fileName.slice(0, -ZIP.length) + PREVIOUS;

/** A project's file, as opposed to a previous save, a template or anything else in the folder. */
export const isProjectFile = (name: string) =>
    name.endsWith(ZIP) && !name.endsWith(PREVIOUS) && !name.endsWith(TEMPLATE);

/** A file name for `name` that no other file has: "Balloon.mosaic.zip", then "Balloon (2).mosaic.zip". */
const freeFileName = (name: string, taken: Set<string>) => {
    const first = projectFileName(name);
    if (!taken.has(first)) return first;
    const base = first.slice(0, -ZIP.length);
    for (let n = 2; ; n++) {
        const next = `${base} (${n})${ZIP}`;
        if (!taken.has(next)) return next;
    }
};

/** A stable id for a file that doesn't carry one (an older file), from its name. */
const idFromName = (name: string) => {
    let hash = 0;
    for (const c of name) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) | 0;
    return `f${(hash >>> 0).toString(36)}`;
};

interface Cached {
    size: number;
    lastModified: number;
    entry: Omit<ProjectEntry, 'savedAt' | 'id'> & { savedAt: string; id: string };
}

/** Ask for (or with `request`, request) read and write access to the folder. Request only after a click. */
export const folderPermission = async (folder: FolderHandle, request = false): Promise<PermissionState> => {
    try {
        const mode = { mode: 'readwrite' } as const;
        return request ? await folder.requestPermission(mode) : await folder.queryPermission(mode);
    } catch {
        return 'denied';
    }
};

/** Forget what was read from the last folder, when another is chosen. */
export const clearFolderCache = () =>
    transact('folderCache', 'readwrite', (tx) => tx.objectStore('folderCache').clear());

/**
 * Projects kept as .mosaic.zip files at the top of a folder. What each file holds is cached by name, size and date,
 * so a visit reads only the files that changed. A file another app changed since it was read is never overwritten:
 * the save goes to a new file beside it.
 */
export const folderStore = (folder: FolderHandle): ProjectStore => {
    // where each project is, the file's date when the app last read or wrote it, and the name it had then
    const files = new Map<string, { fileName: string; lastModified: number; name: string }>();
    let listed = false;

    const fileHandle = (name: string, create = false) => folder.getFileHandle(name, { create });
    const writeFile = async (name: string, data: Uint8Array) => {
        const writable = await (await fileHandle(name, true)).createWritable();
        await writable.write(data as BufferSource);
        await writable.close();
        return (await fileHandle(name)).getFile();
    };
    const bytes = async (file: File) => new Uint8Array(await file.arrayBuffer());

    const list = async () => {
        const cache = new Map(
            (await allValues<Cached & { fileName: string }>('folderCache')).map((c) => [c.fileName, c]),
        );
        const entries: ProjectEntry[] = [];
        files.clear();
        for await (const handle of folder.values()) {
            if (handle.kind !== 'file' || !isProjectFile(handle.name)) continue;
            const file = await handle.getFile();
            const hit = cache.get(handle.name);
            let entry: ProjectEntry;
            if (hit && hit.size === file.size && hit.lastModified === file.lastModified) {
                entry = { ...hit.entry, savedAt: new Date(hit.entry.savedAt), thumbnail: asBytes(hit.entry.thumbnail) };
            } else {
                try {
                    entry = entryFromZip(await bytes(file), {
                        id: idFromName(handle.name),
                        name: handle.name.slice(0, -ZIP.length),
                    });
                } catch {
                    continue; // not a project after all
                }
                // a file without a date in it: the file's own
                if (entry.savedAt.getTime() === 0) entry.savedAt = new Date(file.lastModified);
                await putValue('folderCache', handle.name, {
                    fileName: handle.name,
                    size: file.size,
                    lastModified: file.lastModified,
                    entry: { ...entry, savedAt: entry.savedAt.toISOString() },
                });
            }
            // two files with one id (one copied from the other): the second is its own project
            if (files.has(entry.id)) entry = { ...entry, id: `${entry.id}~${idFromName(handle.name)}` };
            files.set(entry.id, { fileName: handle.name, lastModified: file.lastModified, name: entry.name });
            entries.push(entry);
        }
        listed = true;
        return entries;
    };

    const where = async (id: string) => {
        if (!listed) await list();
        return files.get(id);
    };

    return {
        kind: 'folder',
        list,

        read: async (id) => {
            const known = await where(id);
            if (!known) throw new Error(`That mosaic isn't in ${folder.name} any more.`);
            const file = await (await fileHandle(known.fileName)).getFile();
            files.set(id, { ...known, lastModified: file.lastModified });
            return bytes(file);
        },

        readPrevious: async (id) => {
            const known = await where(id);
            if (!known) return null;
            try {
                return await bytes(await (await fileHandle(previousName(known.fileName))).getFile());
            } catch {
                return null;
            }
        },

        write: async (entry, zip) => {
            const known = await where(entry.id);
            const taken = new Set([...files.values()].map((f) => f.fileName));
            if (known) taken.delete(known.fileName);

            let current: File | null = null;
            if (known)
                try {
                    current = await (await fileHandle(known.fileName)).getFile();
                } catch {
                    // gone from the folder: save it afresh
                }
            const changedElsewhere = !!current && current.lastModified > known!.lastModified;
            if (changedElsewhere) taken.add(known!.fileName);
            // a file keeps its name (even one you gave it yourself) until the project is renamed
            const target =
                known && !changedElsewhere && entry.name === known.name
                    ? known.fileName
                    : freeFileName(entry.name, taken);

            if (current && !changedElsewhere) await writeFile(previousName(target), await bytes(current));
            const written = await writeFile(target, zip);
            // renamed: the old file and its previous save go
            if (known && current && !changedElsewhere && target !== known.fileName) {
                await folder.removeEntry(known.fileName).catch(() => {});
                await folder.removeEntry(previousName(known.fileName)).catch(() => {});
                await deleteValue('folderCache', known.fileName);
            }
            files.set(entry.id, { fileName: target, lastModified: written.lastModified, name: entry.name });
            await putValue('folderCache', target, {
                fileName: target,
                size: written.size,
                lastModified: written.lastModified,
                entry: { ...entry, savedAt: entry.savedAt.toISOString() },
            });
            return changedElsewhere ? { movedTo: target } : {};
        },

        remove: async (id) => {
            const known = await where(id);
            if (!known) return;
            await folder.removeEntry(known.fileName);
            await folder.removeEntry(previousName(known.fileName)).catch(() => {});
            await deleteValue('folderCache', known.fileName);
            files.delete(id);
        },
    };
};
