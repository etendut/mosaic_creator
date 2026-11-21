/**
 * The app's one IndexedDB database. Every store the app keeps lives here, so the version and its upgrade are in one
 * place: two modules opening the same database at different versions would block each other.
 *
 * - `images`: the last image used, from before the library (read once, to move it into the library).
 * - `projects`: each project's entry (name, date, size, thumbnail), keyed by id.
 * - `zips`: each project's .mosaic.zip bytes, keyed by id; apart from `projects` so a list doesn't read megabytes.
 * - `previous`: the save before the latest, per project, to fall back to.
 * - `meta`: small values (where projects are kept, the folder, the last backup).
 * - `folderCache`: entries read from a folder's files, keyed by file name, so a folder isn't unzipped every visit.
 */
const DB_NAME = 'mosaic-creator';
const DB_VERSION = 2;

export type StoreName = 'images' | 'projects' | 'zips' | 'previous' | 'meta' | 'folderCache';
const STORES: StoreName[] = ['images', 'projects', 'zips', 'previous', 'meta', 'folderCache'];

export const dbAvailable = () => typeof indexedDB !== 'undefined';

const openDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

/**
 * One transaction over `stores`: `action` queues its requests, and the promise settles when the transaction
 * completes, with what `action` returned (resolved after completion, so request results are filled in).
 */
export const transact = async <T>(
    stores: StoreName | StoreName[],
    mode: IDBTransactionMode,
    action: (tx: IDBTransaction) => T,
): Promise<T> => {
    const db = await openDb();
    try {
        return await new Promise<T>((resolve, reject) => {
            const tx = db.transaction(stores, mode);
            const result = action(tx);
            tx.oncomplete = () => resolve(result);
            tx.onerror = tx.onabort = () => reject(tx.error);
        });
    } finally {
        db.close();
    }
};

/** A request's result once its transaction has completed. */
export const resultOf = <T>(request: IDBRequest<T>) => request.result;

export const getValue = async <T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> =>
    resultOf(await transact(store, 'readonly', (tx) => tx.objectStore(store).get(key) as IDBRequest<T | undefined>));

export const putValue = (store: StoreName, key: IDBValidKey, value: unknown) =>
    transact(store, 'readwrite', (tx) => void tx.objectStore(store).put(value, key));

export const deleteValue = (store: StoreName, key: IDBValidKey) =>
    transact(store, 'readwrite', (tx) => void tx.objectStore(store).delete(key));

export const allValues = async <T>(store: StoreName): Promise<T[]> =>
    resultOf(await transact(store, 'readonly', (tx) => tx.objectStore(store).getAll() as IDBRequest<T[]>));

/** Stored bytes as a Uint8Array: they can come back from another realm's Uint8Array, so `instanceof` won't do. */
export const asBytes = (value: unknown): Uint8Array | null =>
    ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength) : null;
