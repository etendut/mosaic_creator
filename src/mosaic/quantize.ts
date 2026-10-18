import { nearestColor, rgbToHex, toPaletteEntries, type ColorMetric } from './color';
import type { Cell, PaletteColor, PixelGrid } from './types';

/** Pixels at or below this alpha become empty cells. */
export const TRANSPARENT_ALPHA = 127;

/** Map every pixel of `image` to the nearest palette colour, returning the cell grid. */
export const quantize = (
    image: Pick<ImageData, 'data' | 'width' | 'height'>,
    palette: PaletteColor[],
    metric: ColorMetric = 'rgb',
): PixelGrid => {
    const { data, width, height } = image;
    const entries = toPaletteEntries(palette);
    const cache = new Map<string, PaletteColor>();
    const rows: Cell[][] = [];

    for (let y = 0; y < height; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i + 3] <= TRANSPARENT_ALPHA) {
                row.push(null);
                continue;
            }
            const rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
            const key = rgbToHex(rgb);
            let match = cache.get(key);
            if (!match) {
                const { id, name, hex, type } = nearestColor(rgb, entries, metric);
                match = { id, name, hex, type };
                cache.set(key, match);
            }
            row.push(match);
        }
        rows.push(row);
    }
    return { width, height, rows };
};
