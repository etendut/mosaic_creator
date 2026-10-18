import { rowLabel } from './cards';
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
}

/** Draw the quantised mosaic as bricks on the plate colour, with the card grid overlaid. */
export const drawPreview = (canvas: HTMLCanvasElement, grid: PixelGrid, options: PreviewOptions) => {
    const { cellPx, isRound, background, cellsPerCard } = options;
    canvas.width = grid.width * cellPx;
    canvas.height = grid.height * cellPx;
    const ctx = context2d(canvas);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    grid.rows.forEach((row, y) =>
        row.forEach((cell, x) => {
            if (!cell) return;
            ctx.fillStyle = cell.hex;
            if (isRound) {
                ctx.beginPath();
                ctx.arc((x + 0.5) * cellPx, (y + 0.5) * cellPx, cellPx * 0.45, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(x * cellPx, y * cellPx, cellPx, cellPx);
            }
        }),
    );

    if (cellsPerCard <= 0) return;
    const cardPx = cellsPerCard * cellPx;
    // a dark line under a light one, so card edges show on any brick colour
    const line = (x1: number, y1: number, x2: number, y2: number) => {
        for (const [style, width] of [
            ['rgba(0, 0, 0, 0.55)', 3],
            ['rgba(255, 255, 255, 0.9)', 1],
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

    const fontPx = Math.min(14, Math.max(8, cardPx / 4));
    ctx.font = `bold ${fontPx}px sans-serif`;
    ctx.textBaseline = 'top';
    for (let row = 0; row * cardPx < canvas.height; row++) {
        for (let col = 0; col * cardPx < canvas.width; col++) {
            const label = `${rowLabel(row + 1)}${col + 1}`;
            const x = col * cardPx + 3;
            const y = row * cardPx + 3;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            ctx.fillRect(x - 1, y - 1, ctx.measureText(label).width + 4, fontPx + 2);
            ctx.fillStyle = 'white';
            ctx.fillText(label, x + 1, y);
        }
    }
};
