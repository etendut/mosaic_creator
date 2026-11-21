import type { FolderFile, FolderHandle, PermissionState } from '../library/folderStore';

/**
 * A folder held in memory, standing in for one the File System Access API hands over, so the folder store and the
 * Mosaics view can be tested in jsdom. Each write gets a later date, as a real file would.
 */
export const fakeFolder = (name = 'Mosaics', { permission = 'granted' as PermissionState } = {}) => {
    const files = new Map<string, File>();
    let clock = 1_000_000;
    const state = { permission, requested: 0 };

    const handle = (fileName: string): FolderFile => ({
        kind: 'file',
        name: fileName,
        getFile: async () => {
            const file = files.get(fileName);
            if (!file) throw new DOMException('Not found', 'NotFoundError');
            return file;
        },
        createWritable: async () => {
            const parts: BlobPart[] = [];
            return {
                write: async (data) => void parts.push(data as BlobPart),
                close: async () => void files.set(fileName, new File(parts, fileName, { lastModified: ++clock })),
            };
        },
    });

    const folder: FolderHandle = {
        kind: 'directory',
        name,
        async *values() {
            for (const fileName of [...files.keys()]) yield handle(fileName);
        },
        getFileHandle: async (fileName, options) => {
            if (!files.has(fileName) && !options?.create) throw new DOMException('Not found', 'NotFoundError');
            return handle(fileName);
        },
        removeEntry: async (fileName) => {
            if (!files.delete(fileName)) throw new DOMException('Not found', 'NotFoundError');
        },
        queryPermission: async () => state.permission,
        requestPermission: async () => {
            state.requested++;
            state.permission = 'granted';
            return state.permission;
        },
    };

    return {
        folder,
        state,
        files,
        /** Put a file in the folder, as another app (or a sync app) would, with a later date. */
        put: (fileName: string, bytes: Uint8Array) =>
            files.set(fileName, new File([bytes as BlobPart], fileName, { lastModified: ++clock })),
        /** The folder's file names, sorted. */
        names: () => [...files.keys()].sort(),
        bytes: async (fileName: string) => new Uint8Array(await files.get(fileName)!.arrayBuffer()),
    };
};
