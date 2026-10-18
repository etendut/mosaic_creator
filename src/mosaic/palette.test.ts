import { catalog } from '../data/catalog';
import {
    applySwaps,
    isSolidColor,
    limitColors,
    parseSavedPalette,
    presetColors,
    resolveSwaps,
    selectPalette,
} from './palette';
import type { ColorType, PixelGrid } from './types';

const color = (id: number, name: string, hex: string, type: ColorType = 'Solid') => ({ id, name, hex, type });
const WHITE = color(1, 'White', '#FFFFFF');
const RED = color(5, 'Red', '#B30006');
const BLUE = color(7, 'Blue', '#0057A6');
const BLACK = color(11, 'Black', '#212121');
const LBG = color(86, 'Light Bluish Gray', '#AFB5C7');
const TRANS_CLEAR = color(12, 'Trans-Clear', '#EEEEEE', 'Transparent');
const GLITTER = color(100, 'Glitter Trans-Dark Pink', '#CE1D9B', 'Glitter');
const GLOW = color(159, 'Glow In Dark White', '#D9D9D9', 'Milky');
const PEARL = color(77, 'Pearl Dark Gray', '#666660', 'Pearl');
const COLORS = [WHITE, RED, BLUE, BLACK, LBG, TRANS_CLEAR, GLITTER, GLOW, PEARL];

describe('presetColors', () => {
    it('solid keeps only BrickLink Solid colours', () => {
        expect(presetColors('solid', COLORS)).toEqual([WHITE, RED, BLUE, BLACK, LBG]);
        expect([TRANS_CLEAR, GLITTER, GLOW, PEARL].some(isSolidColor)).toBe(false);
    });

    it('greyscale keeps solid near-neutral colours', () => {
        expect(presetColors('greyscale', COLORS)).toEqual([WHITE, BLACK, LBG]);
    });

    it('all keeps everything', () => {
        expect(presetColors('all', COLORS)).toBe(COLORS);
    });

    it('every catalog brick has solid colours and no trans colour counts as solid', () => {
        for (const brick of catalog.bricks) {
            const solid = presetColors('solid', brick.colors);
            expect(solid.length).toBeGreaterThan(0);
            expect(solid.some((c) => /trans/i.test(c.name))).toBe(false);
        }
    });
});

describe('selectPalette', () => {
    it('uses the custom ids', () => {
        expect(selectPalette('custom', COLORS, new Set([5, 7]))).toEqual([RED, BLUE]);
    });

    it('falls back to solid colours when the selection is empty', () => {
        expect(selectPalette('custom', COLORS, new Set())).toEqual(presetColors('solid', COLORS));
        expect(selectPalette('greyscale', [RED, BLUE, TRANS_CLEAR], new Set())).toEqual([RED, BLUE]);
    });

    it('falls back to everything if there is nothing solid', () => {
        expect(selectPalette('solid', [TRANS_CLEAR], new Set())).toEqual([TRANS_CLEAR]);
    });
});

const pixels = (rgbs: [number, number, number][]) => ({
    data: new Uint8ClampedArray(rgbs.flatMap((p) => [...p, 255])),
});

describe('limitColors', () => {
    it('keeps the colours that matter most to the image', () => {
        // mostly red and blue, a little white: dropping white costs least
        const image = pixels([...Array(10).fill([180, 0, 5]), ...Array(10).fill([0, 90, 170]), [255, 255, 255]]);
        expect(limitColors(image, [WHITE, RED, BLUE, BLACK], 2).map((c) => c.name)).toEqual(['Red', 'Blue']);
    });

    it('drops palette colours the image never uses before anything else', () => {
        const image = pixels([
            [255, 255, 255],
            [30, 30, 30],
        ]);
        expect(limitColors(image, [WHITE, RED, BLUE, BLACK], 3).map((c) => c.name)).toEqual(['White', 'Black']);
    });

    it('returns the palette untouched when it is already small enough', () => {
        const palette = [WHITE, BLACK];
        expect(limitColors(pixels([[0, 0, 0]]), palette, 5)).toBe(palette);
    });
});

describe('applySwaps', () => {
    const grid: PixelGrid = { width: 3, height: 1, rows: [[RED, null, BLUE]] };

    it('replaces swapped colours and leaves the rest', () => {
        expect(applySwaps(grid, new Map([[5, WHITE]])).rows).toEqual([[WHITE, null, BLUE]]);
    });

    it('is a no-op without swaps', () => {
        expect(applySwaps(grid, new Map())).toBe(grid);
    });
});

describe('resolveSwaps', () => {
    it('follows chains to the final colour', () => {
        expect(
            resolveSwaps(
                new Map([
                    [5, 7],
                    [7, 1],
                ]),
            ),
        ).toEqual(
            new Map([
                [5, 1],
                [7, 1],
            ]),
        );
    });

    it('does not loop forever on cycles', () => {
        expect(
            resolveSwaps(
                new Map([
                    [5, 7],
                    [7, 5],
                ]),
            ),
        ).toEqual(
            new Map([
                [5, 7],
                [7, 5],
            ]),
        );
    });
});

describe('parseSavedPalette', () => {
    it('reads a saved palette', () => {
        expect(parseSavedPalette('{"name":"Club","colorIds":[1,11]}')).toEqual({ name: 'Club', colorIds: [1, 11] });
    });

    it('rejects other files', () => {
        expect(() => parseSavedPalette('{"colorIds":["x"]}')).toThrow('Not a palette file');
        expect(() => parseSavedPalette('not json')).toThrow();
    });
});
