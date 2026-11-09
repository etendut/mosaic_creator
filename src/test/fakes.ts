/**
 * Stand-ins for the browser features jsdom doesn't have, so the app's real code can run in tests: a 2D canvas that
 * returns a known picture, images that load, object URLs, downloads and printing.
 */
import { vi } from 'vitest';

/** Bytes every fake canvas "encodes" to. Real PNGs aren't needed: images decode through the fake below. */
export const FAKE_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

/** Size every fake image loads at. */
export const FAKE_IMAGE_SIZE = { width: 400, height: 250 };

/**
 * The picture every fake canvas holds: three vertical bands (red, yellow, blue) over a white bottom quarter, plus a
 * transparent top-left pixel so empty cells are exercised too.
 */
export const fakePixel = (x: number, y: number, width: number, height: number): [number, number, number, number] => {
    if (x === 0 && y === 0) return [0, 0, 0, 0];
    if (y >= height * 0.75) return [250, 250, 250, 255];
    if (x < width / 3) return [200, 10, 10, 255];
    if (x < (width * 2) / 3) return [245, 205, 20, 255];
    return [10, 60, 200, 255];
};

const fakeContext = () => ({
    getImageData: (_x: number, _y: number, width: number, height: number) => {
        const data = new Uint8ClampedArray(width * height * 4);
        for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) data.set(fakePixel(x, y, width, height), (y * width + x) * 4);
        return { width, height, data };
    },
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    drawImage: () => {},
});

/**
 * Failures to simulate once: `nextToBlob` makes the next canvas.toBlob() fail as for a canvas the browser can't
 * encode; `nextImageLoad` makes the next image fail to load as for a file that isn't an image. A file whose name
 * contains "broken" also fails to load.
 */
export const canvasFailures = { nextToBlob: false, nextImageLoad: false };

/** Files the app offered for download, newest last. */
export const downloads: { name: string; blob: Blob }[] = [];

const blobs = new Map<string, Blob>();
let urlCount = 0;

export const installFakes = () => {
    HTMLCanvasElement.prototype.getContext = function () {
        return fakeContext() as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
        const fail = canvasFailures.nextToBlob;
        canvasFailures.nextToBlob = false;
        setTimeout(() => callback(fail ? null : new Blob([FAKE_PNG], { type: 'image/png' })));
    };
    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';

    // images "load" once their src is set, unless the URL says otherwise
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get(this: HTMLImageElement) {
            return this.getAttribute('src') ?? '';
        },
        set(this: HTMLImageElement, value: string) {
            this.setAttribute('src', value);
            const broken =
                canvasFailures.nextImageLoad || !!(blobs.get(value) as File | undefined)?.name?.includes('broken');
            canvasFailures.nextImageLoad = false;
            setTimeout(() => {
                if (broken) return this.onerror?.(new Event('error'));
                this.width = FAKE_IMAGE_SIZE.width;
                this.height = FAKE_IMAGE_SIZE.height;
                this.onload?.(new Event('load'));
            });
        },
    });

    URL.createObjectURL = (blob: Blob) => {
        const url = `blob:fake/${++urlCount}`;
        blobs.set(url, blob);
        return url;
    };
    URL.revokeObjectURL = () => {};

    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        const blob = blobs.get(this.href);
        if (blob && this.download) downloads.push({ name: this.download, blob });
    };

    window.print = vi.fn();
};

export const resetFakes = () => {
    downloads.length = 0;
    canvasFailures.nextToBlob = false;
    canvasFailures.nextImageLoad = false;
};

/** The newest download, as text. */
export const lastDownloadText = async () => {
    const last = downloads.at(-1);
    if (!last) throw new Error('Nothing was downloaded');
    return last.blob.text();
};
