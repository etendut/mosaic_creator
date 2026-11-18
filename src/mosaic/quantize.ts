import { nearestColor, toPaletteEntries, type ColorMetric, type PaletteEntry } from './color';
import type { Cell, PaletteColor, PixelGrid, Rgb } from './types';

/** Pixels at or below this alpha become empty cells. */
export const TRANSPARENT_ALPHA = 127;

/**
 * How pixels between two palette colours are drawn. `none` takes the nearest colour for each pixel (best for logos and
 * flat art). `smooth` is Floyd–Steinberg error diffusion: each pixel's matching error is passed on to its neighbours,
 * so a gradient becomes a mix of colours instead of bands. `pattern` is ordered (Bayer) dithering: each pixel takes one
 * of its two nearest colours in a regular grid, in proportion to how close it is to each.
 */
export type Dithering = 'none' | 'smooth' | 'pattern';

const BAYER_4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
];

/**
 * For ordered dithering: the pixel's nearest colour, the next nearest, and how far the pixel sits from the first
 * towards the second (0 on the first, 1 on the second). A pixel that matches a palette colour exactly gets 0.
 */
export const mixOfTwo = (pixel: Rgb, entries: PaletteEntry[], metric: ColorMetric) => {
    const first = nearestColor(pixel, entries, metric);
    if (entries.length < 2) return { first, second: first, t: 0 };
    const second = nearestColor(
        pixel,
        entries.filter((e) => e !== first),
        metric,
    );
    const d = [second.r - first.r, second.g - first.g, second.b - first.b];
    const length2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    const along = (pixel.r - first.r) * d[0] + (pixel.g - first.g) * d[1] + (pixel.b - first.b) * d[2];
    return { first, second, t: length2 ? Math.min(1, Math.max(0, along / length2)) : 0 };
};

const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));

type Image = Pick<ImageData, 'data' | 'width' | 'height'>;

/** What every dithering mode shares: the image, the palette as cells, and a cached nearest-colour lookup. */
interface Setup {
    image: Image;
    entries: PaletteEntry[];
    metric: ColorMetric;
    cells: Map<number, Cell>;
    rows: Cell[][];
    /** The nearest palette colour, cached by RGB, since photos repeat colours a lot. */
    match: (r: number, g: number, b: number) => PaletteEntry;
    opaque: (x: number, y: number) => boolean;
}

const setUp = (image: Image, palette: PaletteColor[], metric: ColorMetric): Setup => {
    const { data, width, height } = image;
    const entries = toPaletteEntries(palette);
    const cache = new Map<number, PaletteEntry>();
    const match = (r: number, g: number, b: number) => {
        const key = (r << 16) | (g << 8) | b;
        let entry = cache.get(key);
        if (!entry) {
            entry = nearestColor({ r, g, b }, entries, metric);
            cache.set(key, entry);
        }
        return entry;
    };
    return {
        image,
        entries,
        metric,
        cells: new Map(palette.map(({ id, name, hex, type }) => [id, { id, name, hex, type }])),
        rows: Array.from({ length: height }, () => new Array<Cell>(width).fill(null)),
        match,
        opaque: (x, y) => data[(y * width + x) * 4 + 3] > TRANSPARENT_ALPHA,
    };
};

/** No dithering: each pixel takes its nearest colour. */
const nearest = ({ image: { data, width, height }, cells, rows, match, opaque }: Setup) => {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!opaque(x, y)) continue;
            const i = (y * width + x) * 4;
            rows[y][x] = cells.get(match(data[i], data[i + 1], data[i + 2]).id)!;
        }
    }
};

/** Floyd–Steinberg: each pixel's error is passed on to the neighbours not yet matched. */
const smooth = ({ image: { data, width, height }, cells, rows, match, opaque }: Setup) => {
    // working copy of the colours, which collects the error passed on from pixels already matched
    const work = new Float32Array(width * height * 3);
    for (let p = 0; p < width * height; p++) for (let c = 0; c < 3; c++) work[p * 3 + c] = data[p * 4 + c];
    const spread = (x: number, y: number, err: number[], share: number) => {
        if (x < 0 || x >= width || y >= height || !opaque(x, y)) return;
        const p = (y * width + x) * 3;
        for (let c = 0; c < 3; c++) work[p + c] += err[c] * share;
    };
    const matchAt = (x: number, y: number, step: number) => {
        const p = (y * width + x) * 3;
        const r = clamp(work[p]);
        const g = clamp(work[p + 1]);
        const b = clamp(work[p + 2]);
        const entry = match(r, g, b);
        rows[y][x] = cells.get(entry.id)!;
        const err = [r - entry.r, g - entry.g, b - entry.b];
        spread(x + step, y, err, 7 / 16);
        spread(x - step, y + 1, err, 3 / 16);
        spread(x, y + 1, err, 5 / 16);
        spread(x + step, y + 1, err, 1 / 16);
    };
    for (let y = 0; y < height; y++) {
        // serpentine: alternate rows run right to left, so the error doesn't all drift one way
        const step = y % 2 === 0 ? 1 : -1;
        for (let i = 0; i < width; i++) {
            const x = step === 1 ? i : width - 1 - i;
            if (opaque(x, y)) matchAt(x, y, step);
        }
    }
};

/**
 * Ordered (Bayer): each pixel takes the second colour when its share of it beats the threshold from a repeating 4×4
 * grid, so a pixel a quarter of the way to the second colour takes it in 4 of every 16 places.
 */
const pattern = ({ image: { data, width, height }, entries, metric, cells, rows, opaque }: Setup) => {
    const mixes = new Map<number, ReturnType<typeof mixOfTwo>>();
    const mixAt = (i: number) => {
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        let mix = mixes.get(key);
        if (!mix) {
            mix = mixOfTwo({ r: data[i], g: data[i + 1], b: data[i + 2] }, entries, metric);
            mixes.set(key, mix);
        }
        return mix;
    };
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!opaque(x, y)) continue;
            const mix = mixAt((y * width + x) * 4);
            const threshold = (BAYER_4[y % 4][x % 4] + 0.5) / 16;
            rows[y][x] = cells.get((mix.t > threshold ? mix.second : mix.first).id)!;
        }
    }
};

const DITHERERS: Record<Dithering, (setup: Setup) => void> = { none: nearest, smooth, pattern };

/**
 * Map every pixel of `image` to a palette colour, returning the cell grid. Transparent pixels become empty cells and,
 * when dithering, neither take nor pass on error. The error is diffused in RGB, which both colour metrics measure in.
 */
export const quantize = (
    image: Image,
    palette: PaletteColor[],
    metric: ColorMetric = 'rgb',
    dithering: Dithering = 'none',
): PixelGrid => {
    const setup = setUp(image, palette, metric);
    DITHERERS[dithering](setup);
    return { width: image.width, height: image.height, rows: setup.rows };
};
