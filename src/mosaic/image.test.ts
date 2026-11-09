import { canvasFailures, FAKE_IMAGE_SIZE, FAKE_PNG } from '../test/fakes';
import {
    applyEdits,
    canvasToPng,
    drawPreview,
    filterCss,
    flipImage,
    imageToCanvas,
    loadImage,
    pngToImage,
    resizeCanvas,
    shrinkToBricks,
} from './image';
import type { PixelGrid } from './types';

const canvas = (width: number, height: number) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
};

const RED = { id: 5, name: 'Red', hex: '#B30006', type: 'Solid' as const };

describe('image loading', () => {
    it('loads an image', async () => {
        const image = await loadImage('blob:fake/anything');
        expect(image.width).toBe(FAKE_IMAGE_SIZE.width);
    });

    it('reports an image that will not load', async () => {
        canvasFailures.nextImageLoad = true;
        await expect(loadImage('blob:fake/x')).rejects.toThrow('Could not load that image');
    });

    it('decodes PNG bytes, and reports bytes that are not an image', async () => {
        expect((await pngToImage(FAKE_PNG)).height).toBe(FAKE_IMAGE_SIZE.height);
        canvasFailures.nextImageLoad = true;
        await expect(pngToImage(FAKE_PNG)).rejects.toThrow('Could not load that image');
    });

    it('encodes a canvas as PNG bytes', async () => {
        expect(await canvasToPng(canvas(4, 4))).toEqual(FAKE_PNG);
        canvasFailures.nextToBlob = true;
        await expect(canvasToPng(canvas(4, 4))).rejects.toThrow('Could not save the image');
    });

    it('copies an image onto a canvas of the same size', async () => {
        const copy = imageToCanvas(await loadImage('blob:fake/1'));
        expect([copy.width, copy.height]).toEqual([FAKE_IMAGE_SIZE.width, FAKE_IMAGE_SIZE.height]);
    });

    it('needs a 2D canvas', () => {
        const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        expect(() => resizeCanvas(canvas(4, 4), 2, 2)).toThrow('Canvas 2D is not available');
        getContext.mockRestore();
    });
});

describe('edits', () => {
    it('writes colour adjustments as a CSS filter', () => {
        expect(filterCss({ brightness: 110, contrast: 90, saturation: 0 })).toBe(
            'brightness(110%) contrast(90%) saturate(0%)',
        );
    });

    it('flips without changing size', () => {
        const flipped = flipImage(canvas(30, 20), true, true);
        expect([flipped.width, flipped.height]).toEqual([30, 20]);
        expect(flipImage(canvas(30, 20), false, true).width).toBe(30);
    });

    it('crops to the chosen area', () => {
        const edited = applyEdits(canvas(400, 250), {
            crop: { x: 10, y: 20, width: 200, height: 100 },
            rotation: 90,
            brightness: 100,
            contrast: 100,
            saturation: 100,
        });
        expect([edited.width, edited.height]).toEqual([200, 100]);
    });

    it('caps very large crops to 2000 pixels on the long side', () => {
        const edited = applyEdits(canvas(8000, 4000), {
            crop: { x: 0, y: 0, width: 8000, height: 4000 },
            rotation: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
        });
        expect([edited.width, edited.height]).toEqual([2000, 1000]);
    });
});

describe('resizing', () => {
    it('halves repeatedly then lands on the exact size', () => {
        const small = resizeCanvas(canvas(1000, 600), 100, 60);
        expect([small.width, small.height]).toEqual([100, 60]);
    });

    it('shrinks to one pixel per brick, keeping the shape', () => {
        const pixels = shrinkToBricks(canvas(400, 200), 32);
        expect([pixels.width, pixels.height]).toEqual([32, 16]);
        expect(pixels.data).toHaveLength(32 * 16 * 4);
    });

    it('never shrinks to nothing', () => {
        expect(shrinkToBricks(canvas(1000, 1), 8).height).toBe(1);
    });
});

describe('drawPreview', () => {
    const grid: PixelGrid = {
        width: 4,
        height: 3,
        rows: [
            [RED, RED, null, RED],
            [RED, null, RED, RED],
            [RED, RED, RED, RED],
        ],
    };

    const recording = () => {
        const calls: string[] = [];
        const original = HTMLCanvasElement.prototype.getContext;
        const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
            this: HTMLCanvasElement,
            ...args: Parameters<typeof original>
        ) {
            const ctx = original.apply(this, args) as unknown as Record<string, unknown>;
            return new Proxy(ctx, {
                get: (target, key) =>
                    typeof target[key as string] === 'function'
                        ? (...a: unknown[]) => {
                              calls.push(String(key));
                              return (target[key as string] as (...x: unknown[]) => unknown)(...a);
                          }
                        : target[key as string],
            }) as unknown as CanvasRenderingContext2D;
        } as typeof original);
        return { calls, restore: () => spy.mockRestore() };
    };

    it('draws square bricks with card lines and ids', () => {
        const { calls, restore } = recording();
        const c = canvas(1, 1);
        drawPreview(c, grid, { cellPx: 10, isRound: false, background: '#000', cellsPerCard: 2 });
        restore();
        expect([c.width, c.height]).toEqual([40, 30]);
        expect(calls.filter((x) => x === 'fillRect').length).toBeGreaterThan(10);
        expect(calls).toContain('fillText');
        expect(calls).not.toContain('arc');
    });

    it('draws round bricks, and no card overlay when asked', () => {
        const { calls, restore } = recording();
        drawPreview(canvas(1, 1), grid, { cellPx: 10, isRound: true, background: '#000', cellsPerCard: 0 });
        restore();
        expect(calls.filter((x) => x === 'arc')).toHaveLength(10);
        expect(calls).not.toContain('fillText');
    });
});
