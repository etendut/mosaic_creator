import { formatSize, partName, studsToMm } from './units';

describe('units', () => {
    it('gives a size its unit once, in metres past a metre', () => {
        expect(formatSize(studsToMm(32), studsToMm(24))).toBe('256 × 192 mm');
        expect(formatSize(1280, 960)).toBe('1.28 × 0.96 m');
    });

    it('writes part sizes with ×', () => {
        expect(partName('Plate 8 x 8')).toBe('Plate 8 × 8');
        expect(partName('Technic, Brick 16 x 16 x 1 1/3 with Holes')).toBe('Technic, Brick 16 × 16 × 1 1/3 with Holes');
        // a lone x that isn't between sizes stays
        expect(partName('Tile x Round')).toBe('Tile x Round');
    });
});
