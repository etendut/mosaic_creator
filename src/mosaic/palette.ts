import { colorDistance, hexToRgb, nearestColor, type ColorMetric } from './color';
import type { Cell, PaletteColor, PixelGrid } from './types';

export type PalettePreset = 'solid' | 'all' | 'greyscale' | 'custom';

/** Plain opaque colours. Transparent, glow (Milky), pearl, metallic and other finishes are left out. */
export const isSolidColor = (color: PaletteColor) => color.type === 'Solid';

const isGrey = (color: PaletteColor) => {
    const { r, g, b } = hexToRgb(color.hex);
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255 < 0.1;
};

export const presetColors = (preset: Exclude<PalettePreset, 'custom'>, colors: PaletteColor[]) => {
    switch (preset) {
        case 'all':
            return colors;
        case 'solid':
            return colors.filter(isSolidColor);
        case 'greyscale':
            return colors.filter((c) => isSolidColor(c) && isGrey(c));
    }
};

/**
 * The colours a mosaic may use. Never empty: if the selection leaves nothing (e.g. a greyscale preset on a part
 * that has no greys), fall back to solid colours, then to everything.
 */
export const selectPalette = (preset: PalettePreset, colors: PaletteColor[], customIds: ReadonlySet<number>) => {
    const selected = preset === 'custom' ? colors.filter((c) => customIds.has(c.id)) : presetColors(preset, colors);
    if (selected.length > 0) return selected;
    const solid = presetColors('solid', colors);
    return solid.length > 0 ? solid : colors;
};

/** Bucket to 4 bits per channel so the histogram stays small however big the mosaic is. */
const bucketKey = (r: number, g: number, b: number) => ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);

interface Bucket {
    rgb: { r: number; g: number; b: number };
    count: number;
}

const histogram = (image: Pick<ImageData, 'data'>) => {
    const buckets = new Map<number, Bucket>();
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] <= 127) continue;
        const key = bucketKey(data[i], data[i + 1], data[i + 2]);
        const bucket = buckets.get(key);
        if (bucket) bucket.count++;
        // represent the bucket by its centre
        else
            buckets.set(key, {
                rgb: { r: (data[i] & 0xf0) | 8, g: (data[i + 1] & 0xf0) | 8, b: (data[i + 2] & 0xf0) | 8 },
                count: 1,
            });
    }
    return [...buckets.values()];
};

/**
 * Pick the `max` colours from `palette` that best reproduce `image`: start from every colour the image would use,
 * then repeatedly drop whichever colour costs least to lose.
 */
export const limitColors = (
    image: Pick<ImageData, 'data'>,
    palette: PaletteColor[],
    max: number,
    metric: ColorMetric = 'rgb',
): PaletteColor[] => {
    if (palette.length <= max) return palette;
    const buckets = histogram(image);
    const entries = palette.map((c) => ({ color: c, ...hexToRgb(c.hex) }));

    const nearestError = (set: typeof entries, rgb: Bucket['rgb']) => {
        let best = Number.POSITIVE_INFINITY;
        for (const e of set) best = Math.min(best, colorDistance(rgb, e, metric));
        return best;
    };
    const totalError = (set: typeof entries) => buckets.reduce((sum, b) => sum + b.count * nearestError(set, b.rgb), 0);

    const used = new Set(buckets.map((b) => nearestColor(b.rgb, entries, metric)));
    let current = entries.filter((e) => used.has(e));
    while (current.length > max) {
        let bestSet = current;
        let bestError = Number.POSITIVE_INFINITY;
        for (let i = 0; i < current.length; i++) {
            const candidate = current.filter((_, j) => j !== i);
            const error = totalError(candidate);
            if (error < bestError) {
                bestError = error;
                bestSet = candidate;
            }
        }
        current = bestSet;
    }
    return current.map((e) => e.color);
};

/** Replace colours in the grid: `swaps` maps a colour id to the colour that should be used instead. */
export const applySwaps = (grid: PixelGrid, swaps: Map<number, PaletteColor>): PixelGrid => {
    if (swaps.size === 0) return grid;
    const swap = (cell: Cell) => (cell && swaps.get(cell.id)) ?? cell;
    return { ...grid, rows: grid.rows.map((row) => row.map(swap)) };
};

/**
 * Follow swap chains to their end, so swapping A→B then B→C sends A to C. A cycle (A→B, B→A) stops at the last
 * colour before it repeats.
 */
export const resolveSwaps = (swaps: ReadonlyMap<number, number>) => {
    const resolved = new Map<number, number>();
    for (const from of swaps.keys()) {
        const seen = new Set([from]);
        let to = swaps.get(from)!;
        while (swaps.has(to) && !seen.has(swaps.get(to)!)) {
            seen.add(to);
            to = swaps.get(to)!;
        }
        if (to !== from) resolved.set(from, to);
    }
    return resolved;
};

/** One colour in a palette file. Either field may be missing in a hand-written file; `id` wins when both are given. */
export interface SavedPaletteColor {
    id?: number;
    name?: string;
}

/** A palette read from a file, before it is matched against a brick's colours. */
export interface SavedPalette {
    name: string;
    colors: SavedPaletteColor[];
}

/**
 * The palette file: readable names and hex next to each BrickLink id. `colorIds` repeats the ids so the file stays
 * readable by builds that only know the original `{ name, colorIds }` format.
 */
export const paletteFile = (name: string, brickPartId: string, colors: PaletteColor[]) => ({
    name,
    brick: brickPartId,
    colors: colors.map(({ id, name, hex }) => ({ id, name, hex })),
    colorIds: colors.map((c) => c.id),
});

const savedColor = (entry: unknown): SavedPaletteColor | null => {
    if (Number.isInteger(entry)) return { id: entry as number };
    if (typeof entry !== 'object' || entry === null) return null;
    const { id, name } = entry as Record<string, unknown>;
    const color: SavedPaletteColor = {};
    if (Number.isInteger(id)) color.id = id as number;
    if (typeof name === 'string' && name.trim()) color.name = name.trim();
    return color.id === undefined && color.name === undefined ? null : color;
};

/** Reads a palette file in the current format (`colors`) or the original one (`colorIds`). */
export const parseSavedPalette = (text: string): SavedPalette => {
    const value = JSON.parse(text);
    const list: unknown = Array.isArray(value?.colors) ? value.colors : value?.colorIds;
    if (!Array.isArray(list)) throw new Error('Not a palette file');
    const colors = list.map(savedColor);
    if (colors.some((c) => c === null)) throw new Error('Not a palette file');
    return { name: String(value.name ?? 'Palette'), colors: colors as SavedPaletteColor[] };
};

/**
 * Matches a saved palette to the colours a brick comes in: by id, or by name (ignoring case) when there is no id.
 * `missing` labels the colours the brick doesn't come in, by name where the file gives one.
 */
export const resolveSavedPalette = (palette: SavedPalette, available: PaletteColor[]) => {
    const byId = new Map(available.map((c) => [c.id, c]));
    const byName = new Map(available.map((c) => [c.name.toLowerCase(), c]));
    const ids: number[] = [];
    const missing: string[] = [];
    for (const entry of palette.colors) {
        const match = entry.id !== undefined ? byId.get(entry.id) : byName.get(entry.name!.toLowerCase());
        if (!match) missing.push(entry.name ?? `colour ${entry.id}`);
        else if (!ids.includes(match.id)) ids.push(match.id);
    }
    return { ids, missing };
};

/** "A", "A and B", "A, B and C", or "A, B, C, D and 3 more" past `max` names. */
export const listNames = (names: string[], max = 5) => {
    if (names.length <= 1) return names.join('');
    const shown = names.length > max ? names.slice(0, max - 1) : names.slice(0, -1);
    const last = names.length > max ? `${names.length - shown.length} more` : names[names.length - 1];
    return `${shown.join(', ')} and ${last}`;
};
