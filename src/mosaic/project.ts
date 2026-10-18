import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { catalog, DEFAULT_BRICK_ID, DEFAULT_PLATE_ID } from '../data/catalog';
import type { ColorMetric } from './color';
import type { PalettePreset } from './palette';
import type { CardSettings, PaperSize } from './types';

export const MAX_PLATES_ACROSS = 40;

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
    /** [colour id, id of the colour to use instead] */
    swaps: [number, number][];
}

export const DEFAULT_CARD: CardSettings = {
    title: 'Mosaic Creator',
    clubEvent: 'Our Brick Club',
    topMessage: 'Take the ticket and using the bricks on the table, copy the grid below',
    bottomMessage: 'Then hand it to one of the volunteers.\nStand back and watch the magic',
    backgroundColor: '#4CAF50',
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
    swaps: [],
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
            backgroundColor: pick(
                card.backgroundColor,
                (c): c is string => isString(c) && /^#[0-9a-f]{6}$/i.test(c),
                d.card.backgroundColor,
            ),
            paperSize: pick(card.paperSize, oneOf<PaperSize>('A4', 'Letter'), d.card.paperSize),
        },
        preset: pick(v.preset, oneOf<PalettePreset>('solid', 'all', 'greyscale', 'custom'), d.preset),
        customIds: Array.isArray(v.customIds) ? v.customIds.filter(isId) : d.customIds,
        maxColors: isId(v.maxColors) && v.maxColors > 0 ? v.maxColors : null,
        metric: pick(v.metric, oneOf<ColorMetric>('rgb', 'perceptual'), d.metric),
        swaps: Array.isArray(v.swaps)
            ? v.swaps.filter((s): s is [number, number] => Array.isArray(s) && s.length === 2 && s.every(isId))
            : d.swaps,
    };
};

/** What's inside a project zip. Plain files, so the image or settings can be recovered without this app. */
export const PROJECT_FILES = {
    settings: 'project.json',
    image: 'image.png',
    wantedList: 'bricklink-wanted-list.xml',
} as const;

const NOT_A_PROJECT = "That file isn't a Mosaic Creator project.";

export interface ProjectContents {
    settings: ProjectSettings;
    /** The edited image as PNG bytes, if the project has one. */
    image: Uint8Array | null;
}

/**
 * Bundle a project as a zip: project.json (settings, readable in any text editor), image.png (lossless, opens in
 * any image viewer) and, if given, the BrickLink wanted list as it stood when saved.
 */
export const packProject = ({ settings, image }: ProjectContents, wantedList?: string): Uint8Array => {
    const files: Zippable = {
        [PROJECT_FILES.settings]: strToU8(
            JSON.stringify(
                { app: PROJECT_APP, version: PROJECT_VERSION, savedAt: new Date().toISOString(), settings },
                null,
                2,
            ),
        ),
    };
    // PNG is already compressed; storing it as-is saves time for nothing lost
    if (image) files[PROJECT_FILES.image] = [image, { level: 0 }];
    if (wantedList) files[PROJECT_FILES.wantedList] = strToU8(wantedList);
    return zipSync(files);
};

export const unpackProject = (zip: Uint8Array): ProjectContents => {
    let files: Record<string, Uint8Array>;
    try {
        files = unzipSync(zip);
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
    return { settings: sanitizeSettings(value.settings), image: files[PROJECT_FILES.image] ?? null };
};

/** File name for a project, safe on Windows and macOS. */
export const projectFileName = (title: string) =>
    `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'mosaic'}.mosaic.zip`;
