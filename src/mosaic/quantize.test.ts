import { toPaletteEntries } from './color';
import { mixOfTwo, quantize, type Dithering } from './quantize';

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

describe('dithering', () => {
    // a horizontal grey ramp, 32 wide and 8 tall, from black to white
    const ramp = (alpha = () => 255) =>
        image(
            Array.from({ length: 32 * 8 }, (_, p) => {
                const v = Math.round(((p % 32) / 31) * 255);
                return [v, v, v, alpha()];
            }),
            32,
        );
    const names = (grid: ReturnType<typeof quantize>) => grid.rows.map((r) => r.map((c) => c?.name ?? null));
    /** Columns that use more than one colour: where the dithering mixes colours. */
    const mixedColumns = (grid: ReturnType<typeof quantize>) =>
        Array.from({ length: grid.width }, (_, x) => new Set(grid.rows.map((r) => r[x]?.id))).filter((s) => s.size > 1)
            .length;

    it('bands with none, and mixes colours across the ramp when dithering', () => {
        expect(mixedColumns(quantize(ramp(), palette))).toBe(0);
        for (const dithering of ['smooth', 'pattern'] as Dithering[]) {
            const grid = quantize(ramp(), palette, 'rgb', dithering);
            expect(mixedColumns(grid)).toBeGreaterThan(8);
            // the mix follows the ramp: more white towards the right
            const whites = (x0: number) =>
                grid.rows.flatMap((r) => r.slice(x0, x0 + 8)).filter((c) => c?.name === 'White').length;
            expect(whites(0)).toBeLessThan(whites(12));
            expect(whites(12)).toBeLessThan(whites(24));
        }
    });

    it('is deterministic', () => {
        for (const dithering of ['smooth', 'pattern'] as Dithering[])
            expect(names(quantize(ramp(), palette, 'perceptual', dithering))).toEqual(
                names(quantize(ramp(), palette, 'perceptual', dithering)),
            );
    });

    it('leaves flat colours that are in the palette alone', () => {
        const flat = image(
            Array.from({ length: 16 }, () => [255, 255, 255, 255]),
            4,
        );
        for (const dithering of ['smooth', 'pattern'] as Dithering[])
            expect(names(quantize(flat, palette, 'rgb', dithering)).flat()).toEqual(Array(16).fill('White'));
    });

    it('keeps transparent pixels empty, and passes no error through them', () => {
        let n = 0;
        const holes = ramp(() => (n++ % 3 === 0 ? 0 : 255));
        for (const dithering of ['smooth', 'pattern'] as Dithering[]) {
            const grid = quantize(holes, palette, 'rgb', dithering);
            grid.rows.flat().forEach((cell, p) => expect(cell === null).toBe(p % 3 === 0));
        }
        // a grey pixel cut off from its neighbours by transparency matches on its own
        const island = image(
            [
                [0, 0, 0, 0],
                [100, 100, 100, 255],
                [0, 0, 0, 0],
                [100, 100, 100, 255],
            ],
            4,
        );
        expect(names(quantize(island, palette, 'rgb', 'smooth'))[0]).toEqual([null, 'Black', null, 'Black']);
    });

    it('mixes the two nearest colours in proportion for the pattern', () => {
        const entries = toPaletteEntries(palette);
        expect(mixOfTwo({ r: 255, g: 255, b: 255 }, entries, 'rgb')).toMatchObject({ first: { name: 'White' }, t: 0 });
        const quarter = mixOfTwo({ r: 88, g: 88, b: 88 }, entries, 'rgb');
        expect(quarter).toMatchObject({ first: { name: 'Black' }, second: { name: 'White' } });
        expect(quarter.t).toBeCloseTo(0.25, 1);
        expect(mixOfTwo({ r: 9, g: 9, b: 9 }, entries.slice(0, 1), 'rgb')).toMatchObject({ t: 0 });

        // a quarter-grey patch takes white in 4 of every 16 places
        const patch = quantize(
            image(
                Array.from({ length: 16 }, () => [88, 88, 88, 255]),
                4,
            ),
            palette,
            'rgb',
            'pattern',
        );
        expect(patch.rows.flat().filter((c) => c?.name === 'White')).toHaveLength(4);
    });
});
