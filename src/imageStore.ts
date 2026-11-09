import { canvasToPng } from './mosaic/image';

/**
 * The last image used, kept in this browser between visits. IndexedDB rather than localStorage (a few MB, strings
 * only) or a cookie (4 KB, and sent to the server). Stored as lossless PNG like a project file, so the mosaic
 * rebuilds brick for brick. Every call fails quietly: storage can be missing, blocked or full, and the app works
 * the same without it.
 */
const DB_NAME = 'mosaic-creator';
const STORE = 'images';
const KEY = 'last';

const openDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
    const db = await openDb();
    try {
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction(STORE, mode);
            const request = action(tx.objectStore(STORE));
            tx.oncomplete = () => resolve(request.result);
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

const available = () => typeof indexedDB !== 'undefined';

/** Bumped by every change, so a slow PNG encode can't overwrite a newer image or a forget. */
let latest = 0;

export const recallImage = async (): Promise<Uint8Array | null> => {
    if (!available()) return null;
    try {
        const png = await run('readonly', (store) => store.get(KEY));
        return png instanceof Uint8Array ? png : null;
    } catch {
        return null;
    }
};

export const rememberImage = async (image: HTMLCanvasElement) => {
    const change = ++latest;
    if (!available()) return;
    try {
        const png = await canvasToPng(image);
        if (change === latest) await run('readwrite', (store) => store.put(png, KEY));
    } catch {
        // not remembered this time; nothing else depends on it
    }
};

export const forgetImage = async () => {
    ++latest;
    if (!available()) return;
    try {
        await run('readwrite', (store) => store.delete(KEY));
    } catch {
        // nothing stored, or storage unavailable
    }
};
