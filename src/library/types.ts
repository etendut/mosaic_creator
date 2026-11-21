import { unpackProject } from '../mosaic/project';

/** One project as the Mosaics view lists it: enough for its card, without the image. */
export interface ProjectEntry {
    id: string;
    name: string;
    savedAt: Date;
    /** The mosaic's size in bricks, or null when the file doesn't say. */
    bricks: [number, number] | null;
    /** The file's size in bytes. */
    size: number;
    /** The small mosaic for the card, as PNG bytes, or null for a file without one. */
    thumbnail: Uint8Array | null;
}

export interface WriteResult {
    /** Set when the save went to a new file, because something else had changed the old one since it was read. */
    movedTo?: string;
}

/** Where projects are kept: this browser (IndexedDB) or a folder on the device. */
export interface ProjectStore {
    readonly kind: 'browser' | 'folder';
    list(): Promise<ProjectEntry[]>;
    /** The project's .mosaic.zip bytes. */
    read(id: string): Promise<Uint8Array>;
    /** The save before the latest one, if there is one. */
    readPrevious(id: string): Promise<Uint8Array | null>;
    /** Save a project, keeping the save it replaces as the previous one. */
    write(entry: ProjectEntry, zip: Uint8Array): Promise<WriteResult>;
    remove(id: string): Promise<void>;
}

/** The name a project gets when nothing names it. */
export const UNNAMED = 'New mosaic';

/** A new project id. */
export const newProjectId = (): string => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // older browsers: 16 random bytes as hex
    return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * A project's entry, read from its zip. `fallback` fills in what an older file lacks: an id (made up if not given)
 * and a name (from its file name, say).
 */
export const entryFromZip = (zip: Uint8Array, fallback: { id?: string; name?: string } = {}): ProjectEntry => {
    const { meta, thumbnail } = unpackProject(zip, { withImage: false });
    return {
        id: meta.id ?? fallback.id ?? newProjectId(),
        name: meta.name ?? fallback.name ?? UNNAMED,
        savedAt: meta.savedAt ? new Date(meta.savedAt) : new Date(0),
        bricks: meta.bricks ?? null,
        size: zip.byteLength,
        thumbnail,
    };
};

/** A name not taken yet: "Balloon (2)" when "Balloon" is. */
export const freeName = (name: string, taken: string[]) => {
    if (!taken.includes(name)) return name;
    const base = name.replace(/ \(\d+\)$/, '');
    for (let n = 2; ; n++) if (!taken.includes(`${base} (${n})`)) return `${base} (${n})`;
};
