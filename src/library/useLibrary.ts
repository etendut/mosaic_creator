import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadFile } from '../lib/download';
import {
    packBackup,
    packProject,
    projectFileName,
    unpackBackup,
    unpackProject,
    type ProjectSettings,
} from '../mosaic/project';
import { nameFromFile } from './format';
import { browserStore } from './browserStore';
import { clearFolderCache, folderPermission, folderStore, type FolderHandle } from './folderStore';
import { readMeta, writeMeta, type LibraryMeta } from './meta';
import { migrateOldMosaic } from './migrate';
import { entryFromZip, freeName, newProjectId, type ProjectEntry, type ProjectStore, type WriteResult } from './types';

export type StorageKind = 'browser' | 'folder';
export type LibraryStatus = 'loading' | 'ready' | 'blocked';
/** An unasked Toast the Mosaics view may show, at most one a visit (docs/design-system/README.md, Prompts). */
export type LibraryPrompt = 'backup' | 'folder' | null;

/** Changed mosaics, or days since the first change, before Mosaics reminds you to back up. */
export const BACKUP_AFTER_CHANGES = 5;
export const BACKUP_AFTER_DAYS = 14;
/** Mosaics in the browser before Mosaics suggests keeping them in a folder. */
export const SUGGEST_FOLDER_AT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The browser can keep projects in a folder (Chromium on desktop, recent Chrome on Android). */
export const canUseFolders = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

/** What opening a file did: restored a backup, added a project, or found a template (settings and no picture). */
export type Imported =
    | { kind: 'backup'; restored: number; skipped: number }
    | { kind: 'project'; entry: ProjectEntry }
    | { kind: 'template'; settings: ProjectSettings };

/** The list with `entry` in it: replacing the one with its id, or added at the end. */
const withEntry = (entry: ProjectEntry) => (list: ProjectEntry[]) =>
    list.some((p) => p.id === entry.id) ? list.map((p) => (p.id === entry.id ? entry : p)) : [...list, entry];

const backupFileName = (date = new Date()) => `Mosaic Creator backup ${date.toISOString().slice(0, 10)}.zip`;

/**
 * The library: every project, where they're kept, and what you can do with them. A save is checked before it's
 * written (its zip must unpack), and the store keeps the save before it.
 */
export const useLibrary = () => {
    const [meta, setMeta] = useState<LibraryMeta | null>(null);
    const [status, setStatus] = useState<LibraryStatus>('loading');
    const [projects, setProjects] = useState<ProjectEntry[]>([]);
    const [persisted, setPersisted] = useState<boolean | null>(null);
    // the project made from the old single remembered mosaic, if this visit made one
    const [migratedId, setMigratedId] = useState<string | null>(null);
    // when this visit began, for how long ago the first unsaved-to-backup change was
    const [visitStart] = useState(Date.now);

    const kind: StorageKind = meta?.storage === 'folder' && meta.folder ? 'folder' : 'browser';
    const folder = meta?.folder ?? null;
    const store: ProjectStore = useMemo(
        () => (kind === 'folder' && folder ? folderStore(folder) : browserStore),
        [kind, folder],
    );
    // the latest, for callbacks that outlive a render
    const storeRef = useRef(store);
    const projectsRef = useRef(projects);
    useEffect(() => {
        storeRef.current = store;
        projectsRef.current = projects;
    }, [store, projects]);

    const updateMeta = useCallback((change: Partial<LibraryMeta>) => {
        setMeta((m) => (m ? { ...m, ...change } : m));
        return writeMeta(change);
    }, []);

    /** Read the list from `from` (the current store), or say why it can't be read. */
    const load = useCallback(async (from: ProjectStore, handle: FolderHandle | null) => {
        if (handle && (await folderPermission(handle)) !== 'granted') {
            setStatus('blocked');
            return;
        }
        try {
            setProjects(await from.list());
            setStatus('ready');
        } catch {
            // a folder that's gone or can't be read
            setStatus(handle ? 'blocked' : 'ready');
        }
    }, []);

    // first: settings, then the old single mosaic moved in, then the list
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const read = await readMeta();
            // gone already (tests unmount quickly): write nothing into storage that's no longer this app's
            if (cancelled) return;
            let made: string | null = null;
            if (!read.migrated) {
                try {
                    made = await migrateOldMosaic();
                } catch {
                    // the old mosaic couldn't be moved; it stays where it was for next time
                }
                await writeMeta({ migrated: true });
                read.migrated = true;
            }
            const persistedNow = (await navigator.storage?.persisted?.().catch(() => null)) ?? null;
            if (cancelled) return;
            setMigratedId(made);
            setPersisted(persistedNow);
            setMeta(read);
            const handle = read.storage === 'folder' ? read.folder : null;
            await load(handle ? folderStore(handle) : browserStore, handle);
        })();
        return () => {
            cancelled = true;
        };
    }, [load]);

    const upsert = useCallback((entry: ProjectEntry) => setProjects(withEntry(entry)), []);

    /** Note a save for the backup reminder, and ask the browser to keep its storage once there's something in it. */
    const noteSaved = useCallback(
        async (id: string) => {
            if (storeRef.current.kind !== 'browser' || !meta) return;
            if (!meta.changedSinceBackup.includes(id))
                await updateMeta({
                    changedSinceBackup: [...meta.changedSinceBackup, id],
                    changedSince: meta.changedSince ?? new Date().toISOString(),
                });
            if (persisted === false || persisted === null) {
                const granted = (await navigator.storage?.persist?.().catch(() => false)) ?? null;
                setPersisted(granted);
            }
        },
        [meta, persisted, updateMeta],
    );

    /** Save a project. Its zip must unpack first, so a broken save never replaces a good one. */
    const save = useCallback(
        async (entry: ProjectEntry, zip: Uint8Array): Promise<WriteResult> => {
            unpackProject(zip);
            const written = { ...entry, size: zip.byteLength };
            const result = await storeRef.current.write(written, zip);
            upsert(written);
            void noteSaved(entry.id);
            return result;
        },
        [noteSaved, upsert],
    );

    const read = useCallback((id: string) => storeRef.current.read(id), []);
    const readPrevious = useCallback((id: string) => storeRef.current.readPrevious(id), []);

    /** Delete a project; the returned function puts it back, as it was. */
    const remove = useCallback(
        async (id: string) => {
            const from = storeRef.current;
            const entry = projectsRef.current.find((p) => p.id === id);
            const zip = await from.read(id).catch(() => null);
            await from.remove(id);
            setProjects((list) => list.filter((p) => p.id !== id));
            return async () => {
                if (!entry || !zip || storeRef.current !== from) return;
                await from.write(entry, zip);
                upsert(entry);
            };
        },
        [upsert],
    );

    /** Copy a project as "Balloon (2)", next to it, without opening it. */
    const duplicate = useCallback(
        async (id: string) => {
            const original = projectsRef.current.find((p) => p.id === id);
            const contents = unpackProject(await storeRef.current.read(id));
            const entry: ProjectEntry = {
                id: newProjectId(),
                name: freeName(
                    original?.name ?? contents.meta.name ?? 'Copy',
                    projectsRef.current.map((p) => p.name),
                ),
                savedAt: new Date(),
                bricks: contents.meta.bricks ?? null,
                size: 0,
                thumbnail: contents.thumbnail,
            };
            const zip = packProject({
                ...contents,
                meta: { ...contents.meta, ...entry, savedAt: entry.savedAt.toISOString() },
            });
            await save(entry, zip);
            // next to the original in the list, not at the end
            setProjects((list) => {
                const rest = list.filter((p) => p.id !== entry.id);
                const at = rest.findIndex((p) => p.id === id);
                return [...rest.slice(0, at + 1), { ...entry, size: zip.byteLength }, ...rest.slice(at + 1)];
            });
            return entry;
        },
        [save],
    );

    /**
     * Bring in a file: a backup restores every project in it (skipping any the library has a newer copy of); a
     * project joins the library as a new one when its id is taken; a template's settings come back to start from.
     */
    const importFile = useCallback(
        async (bytes: Uint8Array, fileName: string): Promise<Imported> => {
            const inside = unpackBackup(bytes);
            if (inside) {
                let restored = 0;
                let skipped = 0;
                for (const zip of inside) {
                    const contents = unpackProject(zip);
                    const entry = entryFromZip(zip);
                    const here = projectsRef.current.find((p) => p.id === entry.id);
                    if (here && here.savedAt >= entry.savedAt) {
                        skipped++;
                        continue;
                    }
                    const meta = {
                        ...contents.meta,
                        id: entry.id,
                        name: entry.name,
                        savedAt: entry.savedAt.toISOString(),
                    };
                    await save(entry, packProject({ ...contents, meta }));
                    restored++;
                }
                return { kind: 'backup', restored, skipped };
            }
            const contents = unpackProject(bytes);
            if (!contents.image) return { kind: 'template', settings: contents.settings };
            const taken = projectsRef.current.some((p) => p.id === contents.meta.id);
            const entry: ProjectEntry = {
                id: !contents.meta.id || taken ? newProjectId() : contents.meta.id,
                name: freeName(
                    contents.meta.name ?? nameFromFile(fileName.replace(/\.mosaic\.zip$/i, '')),
                    projectsRef.current.map((p) => p.name),
                ),
                savedAt: contents.meta.savedAt ? new Date(contents.meta.savedAt) : new Date(),
                bricks: contents.meta.bricks ?? null,
                size: 0,
                thumbnail: contents.thumbnail,
            };
            const meta = { ...contents.meta, id: entry.id, name: entry.name, savedAt: entry.savedAt.toISOString() };
            await save(entry, packProject({ ...contents, meta }));
            return { kind: 'project', entry };
        },
        [save],
    );

    /** Download every project in one zip, and note when, for the Info bar and the reminder. */
    const backUpAll = useCallback(async () => {
        const from = storeRef.current;
        const zips = await Promise.all(
            projectsRef.current.map(async (p) => ({ name: p.name, zip: await from.read(p.id) })),
        );
        const taken = new Set<string>();
        const files = zips.map(({ name, zip }) => {
            let fileName = projectFileName(name);
            let n = 1;
            while (taken.has(fileName)) fileName = projectFileName(`${name} (${++n})`);
            taken.add(fileName);
            return { fileName, zip };
        });
        downloadFile(packBackup(files), backupFileName(), 'application/zip');
        await updateMeta({
            lastBackup: new Date().toISOString(),
            changedSinceBackup: [],
            changedSince: null,
            backupPromptClosedAt: null,
        });
        return files.length;
    }, [updateMeta]);

    /**
     * Pick a folder (the browser asks which) and keep projects there from now on. Returns the folder's name, or null
     * when you cancelled. The browser library stays as it was, to copy across or come back to.
     */
    const chooseFolder = useCallback(async () => {
        let handle: FolderHandle;
        try {
            handle = await (
                window as unknown as { showDirectoryPicker(o: object): Promise<FolderHandle> }
            ).showDirectoryPicker({ id: 'mosaics', mode: 'readwrite' });
        } catch {
            return null; // cancelled
        }
        await clearFolderCache().catch(() => {});
        await updateMeta({ storage: 'folder', folder: handle });
        setStatus('loading');
        await load(folderStore(handle), handle);
        return handle.name;
    }, [load, updateMeta]);

    /** Keep projects in this browser again (the folder and its files stay as they are). */
    const keepInBrowser = useCallback(async () => {
        await updateMeta({ storage: 'browser' });
        setStatus('loading');
        await load(browserStore, null);
    }, [load, updateMeta]);

    /** Go back to the folder chosen before, if there was one. */
    const keepInFolder = useCallback(async () => {
        if (!folder) return chooseFolder();
        await updateMeta({ storage: 'folder' });
        setStatus('loading');
        await load(folderStore(folder), folder);
        return folder.name;
    }, [folder, chooseFolder, load, updateMeta]);

    /** The browser needs your OK to read the folder again: ask (after a click), then read it. */
    const allowAccess = useCallback(async () => {
        if (!folder) return;
        if ((await folderPermission(folder, true)) === 'granted') await load(store, folder);
    }, [folder, store, load]);

    /** Copy every project kept in the browser into the folder. Returns how many. */
    const copyBrowserIntoFolder = useCallback(async () => {
        const into = storeRef.current;
        if (into.kind !== 'folder') return 0;
        const here = await browserStore.list();
        for (const entry of here) {
            const zip = await browserStore.read(entry.id);
            await into.write(entry, zip);
            upsert(entry);
        }
        return here.length;
    }, [upsert]);

    /** How many projects the browser holds, to offer copying them into a newly chosen folder. */
    const browserCount = useCallback(async () => (await browserStore.list().catch(() => [])).length, []);

    // the one prompt due on opening Mosaics, if any: the backup reminder first, then the folder suggestion
    const prompt: LibraryPrompt = useMemo(() => {
        if (!meta || status !== 'ready' || kind !== 'browser') return null;
        const changed = meta.changedSinceBackup.length;
        const days = meta.changedSince ? (visitStart - Date.parse(meta.changedSince)) / DAY_MS : 0;
        const due = changed >= BACKUP_AFTER_CHANGES || (changed > 0 && days >= BACKUP_AFTER_DAYS);
        if (due && (meta.backupPromptClosedAt === null || changed > meta.backupPromptClosedAt)) return 'backup';
        if (canUseFolders() && !meta.folderPromptClosed && projects.length >= SUGGEST_FOLDER_AT) return 'folder';
        return null;
    }, [meta, status, kind, projects.length, visitStart]);

    /** Closing a prompt means no: the backup one until more changes come, the folder one for good. */
    const closePrompt = useCallback(
        (which: Exclude<LibraryPrompt, null>) =>
            which === 'backup'
                ? updateMeta({ backupPromptClosedAt: meta?.changedSinceBackup.length ?? 0 })
                : updateMeta({ folderPromptClosed: true }),
        [meta, updateMeta],
    );

    return {
        status,
        kind,
        folderName: folder?.name ?? null,
        projects,
        persisted,
        migratedId,
        lastBackup: meta?.lastBackup ? new Date(meta.lastBackup) : null,
        changedSinceBackup: meta?.changedSinceBackup.length ?? 0,
        prompt,
        read,
        readPrevious,
        save,
        remove,
        duplicate,
        importFile,
        backUpAll,
        chooseFolder,
        keepInBrowser,
        keepInFolder,
        allowAccess,
        copyBrowserIntoFolder,
        browserCount,
        closePrompt,
    };
};

export type Library = ReturnType<typeof useLibrary>;
