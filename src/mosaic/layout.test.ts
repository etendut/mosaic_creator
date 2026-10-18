import { CARD_GAP_MM, PAGE_MARGIN_MM, pageLayout, studPxForCard, usesPaperSize } from './layout';

describe('pageLayout', () => {
    it.each([
        [6, 'A4', 'A4 portrait', 3, 6],
        [8, 'Letter', 'Letter portrait', 2, 4],
        [16, 'A4', 'A4 landscape', 2, 2],
        [16, 'Letter', 'Letter landscape', 2, 2],
        [32, 'Letter', 'A3 portrait', 1, 1],
        [48, 'A4', 'A2 portrait', 1, 1],
    ] as const)('%i studs on %s → %s, %i per row, %i per page', (plate, paper, label, columns, perPage) => {
        const layout = pageLayout(plate, paper);
        expect(layout.label).toBe(label);
        expect(layout.columns).toBe(columns);
        expect(layout.cardsPerPage).toBe(perPage);
    });

    it.each([6, 8, 16, 32, 48])('fits %i stud cards inside the printable area', (plate) => {
        for (const paper of ['A4', 'Letter'] as const) {
            const l = pageLayout(plate, paper);
            const usedWidth = l.cardWidthMm * l.columns + CARD_GAP_MM * (l.columns - 1);
            const usedHeight = l.cardHeightMm * l.rows + CARD_GAP_MM * (l.rows - 1);
            expect(usedWidth).toBeCloseTo(l.pageWidthMm - PAGE_MARGIN_MM * 2);
            expect(usedHeight).toBeCloseTo(l.pageHeightMm - PAGE_MARGIN_MM * 2);
        }
    });

    it('sizes A4 landscape 16 stud cards', () => {
        expect(pageLayout(16, 'A4')).toMatchObject({
            pageWidthMm: 297,
            pageHeightMm: 210,
            cardWidthMm: 142.5,
            cardHeightMm: 200,
        });
    });
});

describe('usesPaperSize', () => {
    it('is false for plates that force A3/A2', () => {
        expect([6, 8, 16, 32, 48].map(usesPaperSize)).toEqual([true, true, true, false, false]);
    });
});

describe('studPxForCard', () => {
    it('caps at 30px per stud', () => {
        expect(studPxForCard(2000, 2000, 8)).toBe(30);
    });

    it('shrinks to fit the narrower dimension after leaving room for card text', () => {
        expect(studPxForCard(336, 2000, 16)).toBe(20);
        expect(studPxForCard(2000, 540, 16)).toBe(20);
    });
});
