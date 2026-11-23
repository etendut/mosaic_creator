import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { catalog, DEFAULT_BRICK_ID, DEFAULT_PLATE_ID } from '../data/catalog';
import type { ColorMetric } from './color';
import type { PalettePreset } from './palette';
import type { Dithering } from './quantize';
import type { Edit, TouchUps } from './touchUp';
import type { CardSettings, PaperSize } from './types';

export const MAX_PLATES_ACROSS = 40;
export const MAX_SPARES_PERCENT = 100;
export const MAX_ROUND_UP = 1000;

/** Everything about a mosaic except the image: what a project file and the browser's memory hold. */
export interface ProjectSettings {
    brickId: string;
    plateId: string;
    platesAcross: number;
    card: CardSettings;
    preset: PalettePreset;
    customIds: number[];
    maxColors: number | null;
    metric: ColorMetric;
    dithering: Dithering;
    /** [colour id, id of the colour to use instead] */
    swaps: [number, number][];
    /** Extra bricks to buy, as a whole percentage of each colour (0 to MAX_SPARES_PERCENT). */
    sparesPercent: number;
    /** Each colour's count, after spares, rounded up to a whole number of this many (0 to MAX_ROUND_UP; 0 and 1: none). */
    roundUp: number;
    /** Bricks changed by hand on the Bricks step. */
    touchUps: TouchUps | null;
}

export const DEFAULT_CARD: CardSettings = {
    title: 'Mosaic Creator',
    clubEvent: 'Our Brick Club',
    topMessage: 'Take the ticket and using the bricks on the table, copy the grid below',
    bottomMessage: 'Then hand it to one of the volunteers.\nStand back and watch the magic',
    paperSize: 'A4',
};

export const DEFAULT_PROJECT: ProjectSettings = {
    brickId: DEFAULT_BRICK_ID,
    plateId: DEFAULT_PLATE_ID,
    platesAcross: 4,
    card: DEFAULT_CARD,
    preset: 'solid',
    customIds: [],
    maxColors: null,
    metric: 'rgb',
    dithering: 'none',
    swaps: [],
    sparesPercent: 0,
    roundUp: 0,
    touchUps: null,
};

const PROJECT_APP = 'mosaic-creator';
const PROJECT_VERSION = 1;

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
const isId = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;
const pick = <T>(value: unknown, valid: (v: unknown) => v is T, fallback: T): T => (valid(value) ? value : fallback);
const oneOf =
    <T extends string>(...options: T[]) =>
    (v: unknown): v is T =>
        options.includes(v as T);
const isString = (v: unknown): v is string => typeof v === 'string';

/** Touch-ups from a file: a positive size, and edits inside it to a colour id or to no brick. */
const sanitizeTouchUps = (value: unknown): TouchUps | null => {
    if (!isObject(value) || !Array.isArray(value.edits)) return null;
    const { width, height } = value;
    if (!isId(width) || !isId(height) || width === 0 || height === 0) return null;
    const edits = value.edits.filter(
        (e): e is Edit =>
            Array.isArray(e) &&
            e.length === 3 &&
            isId(e[0]) &&
            isId(e[1]) &&
            e[0] < width &&
            e[1] < height &&
            (e[2] === null || isId(e[2])),
    );
    return edits.length > 0 ? { width, height, edits } : null;
};

/**
 * Turn anything (a project file, the browser's memory, a hand-edited file) into valid settings. Each field that is
 * missing or invalid falls back to its default, so an old or partly broken file still opens.
 */
export const sanitizeSettings = (value: unknown): ProjectSettings => {
    const v = isObject(value) ? value : {};
    const card = isObject(v.card) ? v.card : {};
    const d = DEFAULT_PROJECT;
    const platesAcross = Number(v.platesAcross);

    return {
        brickId: catalog.bricks.some((b) => b.partId === v.brickId) ? (v.brickId as string) : d.brickId,
        plateId: catalog.plates.some((p) => p.id === v.plateId) ? (v.plateId as string) : d.plateId,
        platesAcross:
            Number.isInteger(platesAcross) && platesAcross >= 1 && platesAcross <= MAX_PLATES_ACROSS
                ? platesAcross
                : d.platesAcross,
        card: {
            title: pick(card.title, isString, d.card.title),
            clubEvent: pick(card.clubEvent, isString, d.card.clubEvent),
            topMessage: pick(card.topMessage, isString, d.card.topMessage),
            bottomMessage: pick(card.bottomMessage, isString, d.card.bottomMessage),
            paperSize: pick(card.paperSize, oneOf<PaperSize>('A4', 'Letter', 'A3'), d.card.paperSize),
        },
        preset: pick(v.preset, oneOf<PalettePreset>('solid', 'all', 'greyscale', 'custom'), d.preset),
        customIds: Array.isArray(v.customIds) ? v.customIds.filter(isId) : d.customIds,
        maxColors: isId(v.maxColors) && v.maxColors > 0 ? v.maxColors : null,
        metric: pick(v.metric, oneOf<ColorMetric>('rgb', 'perceptual'), d.metric),
        dithering: pick(v.dithering, oneOf<Dithering>('none', 'smooth', 'pattern'), d.dithering),
        swaps: Array.isArray(v.swaps)
            ? v.swaps.filter((s): s is [number, number] => Array.isArray(s) && s.length === 2 && s.every(isId))
            : d.swaps,
        sparesPercent:
            isId(v.sparesPercent) && v.sparesPercent <= MAX_SPARES_PERCENT ? v.sparesPercent : d.sparesPercent,
        roundUp: isId(v.roundUp) && v.roundUp <= MAX_ROUND_UP ? v.roundUp : d.roundUp,
        touchUps: sanitizeTouchUps(v.touchUps),
    };
};

/** What's inside a project zip. Plain files, so the image or settings can be recovered without this app. */
export const PROJECT_FILES = {
    settings: 'project.json',
    image: 'image.png',
    wantedList: 'bricklink-wanted-list.xml',
    /** The mosaic, small, for the Mosaics grid: so a list never rebuilds a mosaic. */
    thumbnail: 'thumbnail.png',
} as const;

const NOT_A_PROJECT = "That file isn't a Mosaic Creator project.";

/** What the library knows a project by, kept in project.json beside the settings. All optional: older files lack them. */
export interface ProjectMeta {
    id?: string;
    name?: string;
    /** The mosaic's size in bricks when saved. */
    bricks?: [number, number] | null;
    /** When it was saved (ISO 8601). */
    savedAt?: string;
}

export interface ProjectContents {
    settings: ProjectSettings;
    /** The edited image as PNG bytes, if the project has one. */
    image: Uint8Array | null;
    thumbnail?: Uint8Array | null;
    meta?: ProjectMeta;
}

/**
 * Bundle a project as a zip: project.json (settings, readable in any text editor), image.png (lossless, opens in
 * any image viewer) and, if given, the BrickLink wanted list as it stood when saved.
 */
export const packProject = (
    { settings, image, thumbnail, meta = {} }: ProjectContents,
    wantedList?: string,
): Uint8Array => {
    const { id, name, bricks } = meta;
    const files: Zippable = {
        [PROJECT_FILES.settings]: strToU8(
            JSON.stringify(
                {
                    app: PROJECT_APP,
                    version: PROJECT_VERSION,
                    savedAt: meta.savedAt ?? new Date().toISOString(),
                    ...(id && { id }),
                    ...(name && { name }),
                    ...(bricks && { bricks }),
                    settings,
                },
                null,
                2,
            ),
        ),
    };
    // PNG is already compressed; storing it as-is saves time for nothing lost
    if (image) files[PROJECT_FILES.image] = [image, { level: 0 }];
    if (thumbnail) files[PROJECT_FILES.thumbnail] = [thumbnail, { level: 0 }];
    if (wantedList) files[PROJECT_FILES.wantedList] = strToU8(wantedList);
    return zipSync(files);
};

/** The metadata in a parsed project.json, each field checked. */
const readMeta = (value: Loose): ProjectMeta => {
    const bricks = value.bricks;
    return {
        id: isString(value.id) && value.id ? value.id : undefined,
        name: isString(value.name) && value.name.trim() ? value.name.trim() : undefined,
        bricks:
            Array.isArray(bricks) && bricks.length === 2 && bricks.every((n) => isId(n) && n > 0)
                ? [bricks[0], bricks[1]]
                : null,
        savedAt: isString(value.savedAt) && !isNaN(Date.parse(value.savedAt)) ? value.savedAt : undefined,
    };
};

/**
 * Read a project zip. With `withImage: false` the image isn't unzipped, for a list that only needs the name, date
 * and thumbnail.
 */
export const unpackProject = (zip: Uint8Array, { withImage = true } = {}): Required<ProjectContents> => {
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(zip, { filter: (f) => withImage || f.name !== PROJECT_FILES.image });
    } catch {
        throw new Error(NOT_A_PROJECT);
    }
    const settingsFile = files[PROJECT_FILES.settings];
    if (!settingsFile) throw new Error(NOT_A_PROJECT);

    let value: unknown;
    try {
        value = JSON.parse(strFromU8(settingsFile));
    } catch {
        throw new Error(`${PROJECT_FILES.settings} in that zip can't be read.`);
    }
    if (!isObject(value) || value.app !== PROJECT_APP) throw new Error(NOT_A_PROJECT);
    if (typeof value.version === 'number' && value.version > PROJECT_VERSION)
        throw new Error('That project was saved by a newer version of Mosaic Creator.');
    return {
        settings: sanitizeSettings(value.settings),
        image: files[PROJECT_FILES.image] ?? null,
        thumbnail: files[PROJECT_FILES.thumbnail] ?? null,
        meta: readMeta(value),
    };
};

/** What's at the top of a backup zip: every project's .mosaic.zip, and this to say what the zip is. */
export const BACKUP_FILE = 'backup.json';

/** One zip of many projects, each its own .mosaic.zip inside, so any one can be taken out and opened alone. */
export const packBackup = (projects: { fileName: string; zip: Uint8Array }[]): Uint8Array => {
    const files: Zippable = {
        [BACKUP_FILE]: strToU8(
            JSON.stringify(
                {
                    app: PROJECT_APP,
                    version: PROJECT_VERSION,
                    savedAt: new Date().toISOString(),
                    projects: projects.length,
                },
                null,
                2,
            ),
        ),
    };
    // the project zips hold PNGs, already compressed
    for (const { fileName, zip } of projects) files[fileName] = [zip, { level: 0 }];
    return zipSync(files);
};

/** The project zips in a backup, or null when the zip isn't one. */
export const unpackBackup = (zip: Uint8Array): Uint8Array[] | null => {
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(zip);
    } catch {
        return null;
    }
    const about = files[BACKUP_FILE];
    if (!about) return null;
    try {
        const value: unknown = JSON.parse(strFromU8(about));
        if (!isObject(value) || value.app !== PROJECT_APP) return null;
    } catch {
        return null;
    }
    return Object.entries(files)
        .filter(([name]) => name.endsWith('.mosaic.zip'))
        .map(([, bytes]) => bytes);
};

/** File name for a project or a template (settings only), safe on Windows and macOS. */
export const projectFileName = (title: string, template = false) =>
    `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'mosaic'}${template ? ' template' : ''}.mosaic.zip`;
