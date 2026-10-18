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

export const serializeProject = (settings: ProjectSettings, image: string | null) =>
    JSON.stringify({ app: PROJECT_APP, version: PROJECT_VERSION, savedAt: new Date().toISOString(), settings, image });

export interface OpenedProject {
    settings: ProjectSettings;
    /** The edited image as a data: URL, if the project had one. */
    image: string | null;
}

export const parseProject = (text: string): OpenedProject => {
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new Error("That file isn't a Mosaic Creator project.");
    }
    if (!isObject(value) || value.app !== PROJECT_APP) throw new Error("That file isn't a Mosaic Creator project.");
    if (typeof value.version === 'number' && value.version > PROJECT_VERSION)
        throw new Error('That project was saved by a newer version of Mosaic Creator.');
    const image = isString(value.image) && value.image.startsWith('data:image/') ? value.image : null;
    return { settings: sanitizeSettings(value.settings), image };
};

/** File name for a project, safe on Windows and macOS. */
export const projectFileName = (title: string) =>
    `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'mosaic'}.mosaic.json`;
