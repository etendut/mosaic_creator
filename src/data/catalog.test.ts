import { catalog, DEFAULT_BRICK_ID, DEFAULT_PLATE_ID } from './catalog';

describe('catalog', () => {
    it('has the default brick and plate', () => {
        expect(catalog.bricks.find((b) => b.partId === DEFAULT_BRICK_ID)).toBeDefined();
        expect(catalog.plates.find((p) => p.id === DEFAULT_PLATE_ID)).toBeDefined();
    });

    it('has a drawable profile and size for every part', () => {
        for (const part of [...catalog.bricks, ...catalog.plates]) {
            expect(['brick', 'plate', 'tile', 'baseplate', 'technic']).toContain(part.profile);
            expect(part.size).toBeGreaterThan(0);
        }
    });

    it('has no duplicate colours per brick', () => {
        for (const brick of catalog.bricks)
            expect(new Set(brick.colors.map((c) => c.id)).size).toBe(brick.colors.length);
    });
});
