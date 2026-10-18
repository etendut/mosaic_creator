import { cardGridSize, cellsPerCard, compileMosaicCards, rowLabel } from './cards';
import type { Cell, PixelGrid } from './types';

const B = { id: 11, name: 'Black', hex: '#212121', type: 'Solid' as const };
const W = { id: 1, name: 'White', hex: '#FFFFFF', type: 'Solid' as const };
const grid = (rows: Cell[][]): PixelGrid => ({ width: rows[0].length, height: rows.length, rows });

describe('rowLabel', () => {
    it('labels like spreadsheet columns', () => {
        expect([1, 2, 26].map(rowLabel)).toEqual(['A', 'B', 'Z']);
    });

    // regression: the old Math.round version gave 27 → "A" and 40 → "BN"
    it('rolls over past Z', () => {
        expect([27, 40, 52, 53, 702, 703].map(rowLabel)).toEqual(['AA', 'AN', 'AZ', 'BA', 'ZZ', 'AAA']);
    });
});

describe('cellsPerCard / cardGridSize', () => {
    it('divides the plate by the brick size', () => {
        expect(cellsPerCard(16, 1)).toBe(16);
        expect(cellsPerCard(16, 2)).toBe(8);
        expect(cellsPerCard(6, 2)).toBe(3);
    });

    it('rounds partial cards up', () => {
        expect(cardGridSize({ width: 17, height: 16 }, 8)).toEqual({ columns: 3, rows: 2 });
    });
});

describe('compileMosaicCards', () => {
    it('splits left-to-right, top-to-bottom with row letter + column number ids', () => {
        const cards = compileMosaicCards(
            grid([
                [B, W, B, W],
                [W, B, W, B],
                [B, B, W, W],
                [W, W, B, B],
            ]),
            2,
        );

        expect(cards.map((c) => c.id)).toEqual(['A1', 'A2', 'B1', 'B2']);
        expect(cards[1].rows).toEqual([
            [B, W],
            [W, B],
        ]);
    });

    // regression: the old summary started each card's count at 1
    it('counts bricks exactly', () => {
        const cards = compileMosaicCards(grid([[B, null, W]]), 3);
        expect(cards[0].brickCount).toBe(2);
    });

    it('pads cards at the image edge to full plate size', () => {
        const [, edge] = compileMosaicCards(grid([[B, W, B]]), 2);
        expect(edge.id).toBe('A2');
        expect(edge.rows).toEqual([
            [B, null],
            [null, null],
        ]);
    });

    it('skips empty cards but keeps their ids reserved', () => {
        const cards = compileMosaicCards(grid([[null, null, B, W]]), 2);
        expect(cards.map((c) => c.id)).toEqual(['A2']);
    });
});
