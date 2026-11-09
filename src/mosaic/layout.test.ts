import {
    CARD_GAP_MM,
    LEGEND_ROW_MM,
    MAP_HEADER_MM,
    MAP_PAGE_GAP_MM,
    mapPageLayout,
    PAGE_MARGIN_MM,
    pageLayout,
    studPxForCard,
    usesPaperSize,
} from './layout';

describe('mapPageLayout', () => {
    const fits = (l: ReturnType<typeof mapPageLayout>) => {
        const used = MAP_HEADER_MM + l.legendRows * LEGEND_ROW_MM + MAP_PAGE_GAP_MM * 2 + l.mapHeightMm;
        expect(used).toBeLessThanOrEqual(l.contentHeightMm + 1e-9);
        expect(l.mapWidthMm).toBeLessThanOrEqual(l.contentWidthMm + 1e-9);
    };

    it('turns the page to match the mosaic', () => {
        expect(mapPageLayout('A4', { width: 160, height: 96 }, 10).label).toBe('A4 landscape');
        expect(mapPageLayout('Letter', { width: 96, height: 160 }, 10).label).toBe('Letter portrait');
    });

    it('fills the height when the mosaic is tall, keeping its shape', () => {
        const l = mapPageLayout('A4', { width: 96, height: 160 }, 12);
        fits(l);
        expect(l.contentHeightMm - MAP_HEADER_MM - l.legendRows * LEGEND_ROW_MM - MAP_PAGE_GAP_MM * 2).toBeCloseTo(
            l.mapHeightMm,
        );
        expect(l.mapWidthMm / l.mapHeightMm).toBeCloseTo(96 / 160);
    });

    it('fills the width when the mosaic is wide', () => {
        const l = mapPageLayout('A4', { width: 640, height: 80 }, 40);
        fits(l);
        expect(l.mapWidthMm).toBeCloseTo(l.contentWidthMm);
    });

    it('makes room for a long legend', () => {
        const few = mapPageLayout('A4', { width: 160, height: 160 }, 5);
        const many = mapPageLayout('A4', { width: 160, height: 160 }, 60);
        fits(many);
        expect(many.legendRows).toBeGreaterThan(few.legendRows);
        expect(many.mapHeightMm).toBeLessThan(few.mapHeightMm);
    });
});

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
