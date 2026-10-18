import { quantize } from './quantize';

const palette = [
    { id: 11, name: 'Black', hex: '#212121', type: 'Solid' as const },
    { id: 1, name: 'White', hex: '#FFFFFF', type: 'Solid' as const },
];

const image = (pixels: number[][], width: number) => ({
    data: new Uint8ClampedArray(pixels.flat()),
    width,
    height: pixels.length / width,
});

describe('quantize', () => {
    it('maps pixels to palette cells row by row', () => {
        const grid = quantize(
            image(
                [
                    [0, 0, 0, 255],
                    [250, 250, 250, 255],
                    [240, 240, 240, 255],
                    [20, 20, 20, 255],
                ],
                2,
            ),
            palette,
        );

        expect(grid.width).toBe(2);
        expect(grid.height).toBe(2);
        expect(grid.rows.map((r) => r.map((c) => c?.name))).toEqual([
            ['Black', 'White'],
            ['White', 'Black'],
        ]);
    });

    it('treats mostly transparent pixels as empty cells', () => {
        const grid = quantize(
            image(
                [
                    [255, 255, 255, 0],
                    [255, 255, 255, 100],
                    [255, 255, 255, 200],
                ],
                3,
            ),
            palette,
        );

        expect(grid.rows[0].map((c) => c?.name ?? null)).toEqual([null, null, 'White']);
    });

    it('does not modify the image', () => {
        const img = image([[10, 10, 10, 255]], 1);
        quantize(img, palette);
        expect([...img.data]).toEqual([10, 10, 10, 255]);
    });
});
