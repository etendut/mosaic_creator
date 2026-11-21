import { getValue, putValue } from '../lib/db';
import type { FolderHandle } from './folderStore';

/**
 * The library's own small values, in IndexedDB's `meta` store: where projects are kept, the folder, and the backup
 * and prompt bookkeeping. Reads fall back to the defaults when storage is missing or blocked.
 */
export interface LibraryMeta {
    storage: 'browser' | 'folder';
    folder: FolderHandle | null;
    /** The library was made from the app's old single remembered mosaic (or there was none to make it from). */
    migrated: boolean;
    /** When Back up all last ran (ISO), and which projects were saved since then. */
    lastBackup: string | null;
    changedSinceBackup: string[];
    /** When the first of those saves happened (ISO): 14 days on, a reminder is due. */
    changedSince: string | null;
    /** How many changes there were when you closed the backup reminder: it comes back with more. */
    backupPromptClosedAt: number | null;
    /** You closed the suggestion to keep mosaics in a folder: it doesn't come back. */
    folderPromptClosed: boolean;
}

const DEFAULTS: LibraryMeta = {
    storage: 'browser',
    folder: null,
    migrated: false,
    lastBackup: null,
    changedSinceBackup: [],
    changedSince: null,
    backupPromptClosedAt: null,
    folderPromptClosed: false,
};

export const readMeta = async (): Promise<LibraryMeta> => {
    const meta = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS) as (keyof LibraryMeta)[]) {
        try {
            const value = await getValue('meta', key);
            if (value !== undefined) (meta as Record<string, unknown>)[key] = value;
        } catch {
            // storage unavailable: the default
        }
    }
    return meta;
};

export const writeMeta = async (change: Partial<LibraryMeta>) => {
    for (const [key, value] of Object.entries(change)) {
        try {
            await putValue('meta', key, value);
        } catch {
            // not kept this time; the library works on without it
        }
    }
};

/** The project that was open last, and its step, so the next visit carries on there. */
const OPEN_KEY = 'mosaic-creator:open';

export const readOpen = (): { id: string; step: string } | null => {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(OPEN_KEY) ?? 'null');
        if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string')
            return { id: value.id, step: 'step' in value && typeof value.step === 'string' ? value.step : '' };
    } catch {
        // nothing usable
    }
    return null;
};

export const writeOpen = (open: { id: string; step: string } | null) => {
    try {
        if (open) localStorage.setItem(OPEN_KEY, JSON.stringify(open));
        else localStorage.removeItem(OPEN_KEY);
    } catch {
        // not remembered this time
    }
};
