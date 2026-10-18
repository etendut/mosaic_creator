import type { Cell, PaletteColor, Rgb } from './types';

export const hexToRgb = (hex: string): Rgb => {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
    if (!match) throw new Error(`Invalid hex colour: ${hex}`);
    const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join('') : match[1];
    return {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
    };
};

export const rgbToHex = ({ r, g, b }: Rgb) =>
    `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;

/**
 * `rgb` is plain euclidean distance (the old app's behaviour). `perceptual` is "redmean", a cheap weighting towards
 * how different colours look (https://www.compuphase.com/cmetric.htm). On the LEGO palettes they disagree on ~14% of
 * colours with no clear winner, so the user can pick.
 */
export type ColorMetric = 'perceptual' | 'rgb';

/** Squared distance; only used for ranking so the sqrt is skipped. */
export const colorDistance = (a: Rgb, b: Rgb, metric: ColorMetric = 'rgb') => {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    if (metric === 'rgb') return dr * dr + dg * dg + db * db;
    const redMean = (a.r + b.r) / 2;
    return (2 + redMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - redMean) / 256) * db * db;
};

export const nearestColor = <T extends Rgb>(color: Rgb, palette: T[], metric: ColorMetric = 'rgb'): T => {
    if (palette.length === 0) throw new Error('Palette is empty');
    let best = palette[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const candidate of palette) {
        const distance = colorDistance(color, candidate, metric);
        if (distance < bestDistance) {
            best = candidate;
            bestDistance = distance;
        }
    }
    return best;
};

/** Black or white, whichever reads better on `hex` (YIQ brightness). Empty cells read as black. */
export const contrastTextColor = (hex: string | undefined) => {
    if (!hex) return 'black';
    const { r, g, b } = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? 'black' : 'white';
};

export const cellHex = (cell: Cell) => cell?.hex ?? 'transparent';

export type PaletteEntry = PaletteColor & Rgb;

export const toPaletteEntries = (colors: PaletteColor[]): PaletteEntry[] =>
    colors.map((c) => ({ ...c, ...hexToRgb(c.hex) }));
