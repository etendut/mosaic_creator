import { canvasToPng } from '../mosaic/image';
import { asBytes, dbAvailable, deleteValue, getValue, putValue } from './db';

/**
 * The last image used, as the app kept it before the library: one PNG in IndexedDB. The library reads it once to make
 * the first project from it (src/library/migrate.ts), then forgets it. `rememberImage` stays for tests that set up an
 * old visit. Every call fails quietly: storage can be missing, blocked or full.
 */
const KEY = 'last';

export const recallImage = async (): Promise<Uint8Array | null> => {
    if (!dbAvailable()) return null;
    try {
        return asBytes(await getValue('images', KEY));
    } catch {
        return null;
    }
};

export const rememberImage = async (image: HTMLCanvasElement) => {
    if (!dbAvailable()) return;
    try {
        await putValue('images', KEY, await canvasToPng(image));
    } catch {
        // not remembered this time
    }
};

export const forgetImage = async () => {
    if (!dbAvailable()) return;
    try {
        await deleteValue('images', KEY);
    } catch {
        // nothing stored, or storage unavailable
    }
};
