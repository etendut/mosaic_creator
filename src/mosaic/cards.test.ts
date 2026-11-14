import { cardColorCounts, cardGridSize, cellsPerCard, compileMosaicCards, rowLabel } from './cards';
import type { Cell, PixelGrid } from './types';

const B = { id: 11, name: 'Black', hex: '#212121', type: 'Solid' as const };
const W = { id: 1, name: 'White', hex: '#FFFFFF', type: 'Solid' as const };
const grid = (rows: Cell[][]): PixelGrid => ({ width: rows[0].length, height: rows.length, rows });

describe('cardColorCounts', () => {
    it("counts a card's bricks per colour, most first, then by id, skipping empty cells", () => {
        const a = { id: 5, name: 'Red', hex: '#B30006', type: 'Solid' as const };
        const b = { id: 1, name: 'White', hex: '#FFFFFF', type: 'Solid' as const };
        const c = { id: 11, name: 'Black', hex: '#212121', type: 'Solid' as const };
        const card = {
            id: 'A1',
            brickCount: 6,
            rows: [
                [a, b, null],
                [c, a, b],
                [a, null, null],
            ],
        };
        const counts = cardColorCounts(card);
        expect(counts.map((x) => [x.color.id, x.count])).toEqual([
            [5, 3],
            [1, 2],
            [11, 1],
        ]);
        expect(counts.reduce((sum, x) => sum + x.count, 0)).toBe(card.brickCount);
    });
});

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
