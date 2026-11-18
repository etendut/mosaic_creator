import { rowLabel } from './cards';
import { hexToRgb } from './color';
import type { PixelGrid } from './types';

/** Edited images are capped to this many pixels on the long side; mosaics are far smaller than this. */
const MAX_EDIT_SIZE = 2000;

export interface Area {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ImageEdits {
    /** Crop in source-image pixels, measured after rotation (as react-easy-crop reports it). */
    crop: Area;
    rotation: number;
    /** Percentages, 100 = unchanged. */
    brightness: number;
    contrast: number;
    saturation: number;
}

export const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not load that image'));
        image.src = src;
    });

const createCanvas = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
};

const context2d = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D is not available');
    return ctx;
};

export const filterCss = ({
    brightness,
    contrast,
    saturation,
}: Pick<ImageEdits, 'brightness' | 'contrast' | 'saturation'>) =>
    `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

/** Copy an image onto a new canvas. */
export const imageToCanvas = (image: HTMLImageElement) => {
    const canvas = createCanvas(image.width, image.height);
    context2d(canvas).drawImage(image, 0, 0);
    return canvas;
};

/**
 * Encode an image for a project file. Always lossless PNG: JPEG shifts pixels near colour edges, so a reopened
 * project would match a few bricks differently from the parts already ordered. PNG also keeps transparency.
 */
export const canvasToPng = (canvas: HTMLCanvasElement) =>
    new Promise<Uint8Array>((resolve, reject) =>
        canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Could not save the image'));
            blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
        }, 'image/png'),
    );

/**
 * Decode PNG bytes (from a project file) into an image. The image keeps its blob: URL as its src because the image
 * step displays it from there; whoever replaces the image revokes it, as for any chosen file.
 */
export const pngToImage = async (png: Uint8Array) => {
    const url = URL.createObjectURL(new Blob([png.slice()], { type: 'image/png' }));
    try {
        return await loadImage(url);
    } catch (e) {
        URL.revokeObjectURL(url);
        throw e;
    }
};

/** Mirror an image. Done as a separate step so the cropper can show the flipped image. */
export const flipImage = (
    image: CanvasImageSource & { width: number; height: number },
    flipH: boolean,
    flipV: boolean,
) => {
    const canvas = createCanvas(image.width, image.height);
    const ctx = context2d(canvas);
    ctx.translate(flipH ? canvas.width : 0, flipV ? canvas.height : 0);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(image, 0, 0);
    return canvas;
};

/** Apply rotation, crop and colour adjustments, returning a new canvas. */
export const applyEdits = (image: CanvasImageSource & { width: number; height: number }, edits: ImageEdits) => {
    const radians = (edits.rotation * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    const boundsWidth = image.width * cos + image.height * sin;
    const boundsHeight = image.width * sin + image.height * cos;

    // draw the whole image rotated onto its bounding box, then cut the crop out of that
    const rotated = createCanvas(boundsWidth, boundsHeight);
    const rctx = context2d(rotated);
    rctx.filter = filterCss(edits);
    rctx.translate(boundsWidth / 2, boundsHeight / 2);
    rctx.rotate(radians);
    rctx.drawImage(image, -image.width / 2, -image.height / 2);

    const scale = Math.min(1, MAX_EDIT_SIZE / Math.max(edits.crop.width, edits.crop.height));
    const output = createCanvas(edits.crop.width * scale, edits.crop.height * scale);
    const octx = context2d(output);
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(
        rotated,
        edits.crop.x,
        edits.crop.y,
        edits.crop.width,
        edits.crop.height,
        0,
        0,
        output.width,
        output.height,
    );
    return output;
};

/** Downscale by repeated halving, which keeps detail far better than one big drawImage step. */
export const resizeCanvas = (source: HTMLCanvasElement, width: number, height: number) => {
    let current = source;
    while (current.width / 2 >= width && current.height / 2 >= height) {
        const half = createCanvas(current.width / 2, current.height / 2);
        const ctx = context2d(half);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(current, 0, 0, half.width, half.height);
        current = half;
    }
    const output = createCanvas(width, height);
    const ctx = context2d(output);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, output.width, output.height);
    return output;
};

/** Resize the edited image to one pixel per brick, keeping its shape. */
export const shrinkToBricks = (source: HTMLCanvasElement, widthBricks: number): ImageData => {
    const heightBricks = Math.max(1, Math.round((widthBricks * source.height) / source.width));
    const small = resizeCanvas(source, widthBricks, heightBricks);
    return context2d(small).getImageData(0, 0, small.width, small.height);
};

export interface PreviewOptions {
    cellPx: number;
    isRound: boolean;
    background: string;
    /** Draw card boundaries and ids every `cellsPerCard` cells; 0 to hide. */
    cellsPerCard: number;
    /** Height of the card ids in canvas px; by default sized for the map on screen (8 to 14 px). */
    labelPx?: number;
}

/** Printed height of the card ids on the map page. */
export const MAP_LABEL_MM = 8;

/**
 * Card id size for a map image drawn `canvasWidthPx` wide and printed `printWidthMm` wide: MAP_LABEL_MM tall on
 * paper, but at most 30% of a card, so small cards keep most of their bricks in view.
 */
export const printLabelPx = (cardPx: number, canvasWidthPx: number, printWidthMm: number) => {
    const pxPerMm = printWidthMm > 0 ? canvasWidthPx / printWidthMm : 0;
    return Math.max(8, Math.min(cardPx * 0.3, MAP_LABEL_MM * pxPerMm));
};

/** Draw the quantised mosaic as bricks on the plate colour, with the card grid overlaid. */
/** Bricks this small or smaller are drawn as pixels: a circle can't be told from a square at that size anyway. */
const PIXEL_BRICK_MAX_PX = 8;

/**
 * How much of each pixel of a `cellPx` square a brick covers, 0–1: a circle 90% across, sampled 4 × 4 per pixel so
 * its edge is anti-aliased like a canvas path; or the whole square.
 */
const brickCoverage = (cellPx: number, isRound: boolean) => {
    const coverage = new Float32Array(cellPx * cellPx);
    if (!isRound) return coverage.fill(1);
    const c = cellPx / 2;
    const r2 = (cellPx * 0.45) ** 2;
    const S = 4;
    /** The share of the pixel at (x, y) inside the circle, from S × S samples across it. */
    const covered = (x: number, y: number) => {
        let inside = 0;
        for (let i = 0; i < S * S; i++) {
            const dx = x + ((i % S) + 0.5) / S - c;
            const dy = y + (Math.floor(i / S) + 0.5) / S - c;
            if (dx * dx + dy * dy <= r2) inside++;
        }
        return inside / (S * S);
    };
    for (let y = 0; y < cellPx; y++) for (let x = 0; x < cellPx; x++) coverage[y * cellPx + x] = covered(x, y);
    return coverage;
};

/**
 * Small bricks as pixels in one ImageData: a big mosaic has millions of bricks, which as canvas paths take seconds
 * to build and rasterise, and as pixels take milliseconds. Each colour's brick is worked out once, blended into the
 * plate colour at its edge, then copied into place.
 */
const drawBrickPixels = (
    ctx: CanvasRenderingContext2D,
    grid: PixelGrid,
    cellPx: number,
    isRound: boolean,
    background: string,
) => {
    const width = grid.width * cellPx;
    const image = ctx.createImageData(width, grid.height * cellPx);
    const pixels = new Uint32Array(image.data.buffer);
    const plate = hexToRgb(background);
    // a 32-bit RGBA value in the byte order the canvas stores (little-endian: A, B, G, R)
    const pack = (r: number, g: number, b: number) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    pixels.fill(pack(plate.r, plate.g, plate.b));
    const coverage = brickCoverage(cellPx, isRound);
    const mix = (from: number, to: number, t: number) => Math.round(from + (to - from) * t);
    const brickOf = (hex: string) => {
        const { r, g, b } = hexToRgb(hex);
        return Uint32Array.from(coverage, (t) => pack(mix(plate.r, r, t), mix(plate.g, g, t), mix(plate.b, b, t)));
    };
    const bricks = new Map<string, Uint32Array>();
    grid.rows.forEach((row, y) =>
        row.forEach((cell, x) => {
            if (!cell) return;
            const brick = bricks.get(cell.hex) ?? brickOf(cell.hex);
            bricks.set(cell.hex, brick);
            for (let dy = 0; dy < cellPx; dy++)
                pixels.set(brick.subarray(dy * cellPx, (dy + 1) * cellPx), (y * cellPx + dy) * width + x * cellPx);
        }),
    );
    ctx.putImageData(image, 0, 0);
};

/** Bigger bricks as shapes, one path per colour filled once, so circles stay smooth. */
const drawBrickShapes = (ctx: CanvasRenderingContext2D, grid: PixelGrid, cellPx: number, isRound: boolean) => {
    const byColour = new Map<string, number[]>();
    grid.rows.forEach((row, y) =>
        row.forEach((cell, x) => {
            if (!cell) return;
            const at = byColour.get(cell.hex);
            if (at) at.push(x, y);
            else byColour.set(cell.hex, [x, y]);
        }),
    );
    const r = cellPx * 0.45;
    for (const [hex, at] of byColour) {
        ctx.fillStyle = hex;
        ctx.beginPath();
        for (let i = 0; i < at.length; i += 2) {
            const [x, y] = [at[i], at[i + 1]];
            if (isRound) {
                ctx.moveTo((x + 0.5) * cellPx + r, (y + 0.5) * cellPx);
                ctx.arc((x + 0.5) * cellPx, (y + 0.5) * cellPx, r, 0, Math.PI * 2);
            } else ctx.rect(x * cellPx, y * cellPx, cellPx, cellPx);
        }
        ctx.fill();
    }
};

export const drawPreview = (canvas: HTMLCanvasElement, grid: PixelGrid, options: PreviewOptions) => {
    const { cellPx, isRound, background, cellsPerCard, labelPx } = options;
    canvas.width = grid.width * cellPx;
    canvas.height = grid.height * cellPx;
    const ctx = context2d(canvas);
    if (cellPx <= PIXEL_BRICK_MAX_PX) drawBrickPixels(ctx, grid, cellPx, isRound, background);
    else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawBrickShapes(ctx, grid, cellPx, isRound);
    }

    if (cellsPerCard <= 0) return;
    const cardPx = cellsPerCard * cellPx;
    // a dark line under a light one, so card edges show on any brick colour; thicker with bigger bricks (the map page
    // draws them at up to 64 px), the same as before at screen sizes
    const dark = Math.max(3, Math.round(cellPx * 0.12));
    const light = Math.max(1, Math.round(cellPx * 0.04));
    const line = (x1: number, y1: number, x2: number, y2: number) => {
        for (const [style, width] of [
            ['rgba(0, 0, 0, 0.55)', dark],
            ['rgba(255, 255, 255, 0.9)', light],
        ] as const) {
            ctx.strokeStyle = style;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    };
    for (let x = 0; x <= canvas.width; x += cardPx) line(x + 0.5, 0, x + 0.5, canvas.height);
    for (let y = 0; y <= canvas.height; y += cardPx) line(0, y + 0.5, canvas.width, y + 0.5);

    const fontPx = labelPx ?? Math.min(14, Math.max(8, cardPx / 4));
    // the label's box and inset grow with the text
    const pad = Math.max(1, Math.round(fontPx * 0.15));
    ctx.font = `bold ${fontPx}px sans-serif`;
    ctx.textBaseline = 'top';
    for (let row = 0; row * cardPx < canvas.height; row++) {
        for (let col = 0; col * cardPx < canvas.width; col++) {
            const label = `${rowLabel(row + 1)}${col + 1}`;
            const x = col * cardPx + 2 + pad;
            const y = row * cardPx + 2 + pad;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(x - pad, y - pad, ctx.measureText(label).width + pad * 2, fontPx + pad * 2);
            ctx.fillStyle = 'white';
            ctx.fillText(label, x, y);
        }
    }
};
