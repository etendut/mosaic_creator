import { DEFAULT_CARD } from './project';
import type { PaperSize } from './types';
import {
    CARD_GAP_MM,
    CARD_TEXT,
    cardLayout,
    cardText,
    type CardContent,
    MAX_MESSAGE_LINES,
    messageLines,
    STUD_MM,
    LEGEND_ROW_MM,
    MAP_HEADER_MM,
    MAP_PAGE_GAP_MM,
    mapPageLayout,
    PAGE_MARGIN_MM,
    pageForMosaic,
} from './layout';

describe('mapPageLayout', () => {
    const fits = (l: ReturnType<typeof mapPageLayout>) => {
        const used = MAP_HEADER_MM + l.legendRows * LEGEND_ROW_MM + MAP_PAGE_GAP_MM * 2 + l.mapHeightMm;
        expect(used).toBeLessThanOrEqual(l.contentHeightMm + 1e-9);
        expect(l.mapWidthMm).toBeLessThanOrEqual(l.contentWidthMm + 1e-9);
    };

    const onOwnPage = (paper: 'A4' | 'Letter', mosaic: { width: number; height: number }, colors: number) =>
        mapPageLayout(pageForMosaic(paper, mosaic), mosaic, colors);

    it('turns its own page to match the mosaic', () => {
        expect(onOwnPage('A4', { width: 160, height: 96 }, 10).label).toBe('A4 landscape');
        expect(onOwnPage('Letter', { width: 96, height: 160 }, 10).label).toBe('Letter portrait');
    });

    it('fits on a card page of any orientation', () => {
        for (const plate of [6, 8, 16, 32, 48])
            for (const mosaic of [
                { width: 96, height: 160 },
                { width: 640, height: 48 },
            ])
                fits(
                    mapPageLayout(
                        cardLayout({
                            plateStuds: plate,
                            brickStuds: 1,
                            paperSize: 'A4',
                            content: { ...DEFAULT_CARD, bagListColors: 0 },
                        }),
                        mosaic,
                        30,
                    ),
                );
    });

    it('fills the height when the mosaic is tall, keeping its shape', () => {
        const l = onOwnPage('A4', { width: 96, height: 160 }, 12);
        fits(l);
        expect(l.contentHeightMm - MAP_HEADER_MM - l.legendRows * LEGEND_ROW_MM - MAP_PAGE_GAP_MM * 2).toBeCloseTo(
            l.mapHeightMm,
        );
        expect(l.mapWidthMm / l.mapHeightMm).toBeCloseTo(96 / 160);
    });

    it('fills the width when the mosaic is wide', () => {
        const l = onOwnPage('A4', { width: 640, height: 80 }, 40);
        fits(l);
        expect(l.mapWidthMm).toBeCloseTo(l.contentWidthMm);
    });

    it('makes room for a long legend', () => {
        const few = onOwnPage('A4', { width: 160, height: 160 }, 5);
        const many = onOwnPage('A4', { width: 160, height: 160 }, 60);
        fits(many);
        expect(many.legendRows).toBeGreaterThan(few.legendRows);
        expect(many.mapHeightMm).toBeLessThan(few.mapHeightMm);
    });
});

describe('cardLayout', () => {
    const layoutOf = (
        plateStuds: number,
        {
            brickStuds = 1,
            paperSize = 'A4' as PaperSize,
            content = { ...DEFAULT_CARD, bagListColors: 0 } as CardContent,
        } = {},
    ) => cardLayout({ plateStuds, brickStuds, paperSize, content });

    it.each([
        [6, 10],
        [8, 8],
        [16, 2],
    ])('real size: %i stud cards, cells the size of the brick, %i per A4', (plate, perPage) => {
        const l = layoutOf(plate);
        expect(l.cardsPerPage).toBeGreaterThanOrEqual(perPage);
        expect(l.cellMm).toBeGreaterThanOrEqual(STUD_MM * 0.94);
        expect(l.cellMm).toBeLessThanOrEqual(STUD_MM);
        expect(l.sheet).toBe('A4');
    });

    it('sizes 2×2 brick cards per brick, not per stud', () => {
        expect(layoutOf(8, { brickStuds: 2 }).cellMm).toBeGreaterThan(15);
    });

    it('moves big plates to A3/A2 when they need it, and says the paper choice no longer applies', () => {
        expect(layoutOf(32)).toMatchObject({ sheet: 'A3', usesPaper: false, cardsPerPage: 1 });
        expect(layoutOf(48)).toMatchObject({ sheet: 'A2', usesPaper: false });
        expect(layoutOf(8, { paperSize: 'Letter' }).label).toMatch(/^Letter/);
    });

    it('prints on A3 when chosen: more cards a page, and big plates on the paper itself', () => {
        expect(layoutOf(8, { paperSize: 'A3' }).cardsPerPage).toBeGreaterThan(layoutOf(8).cardsPerPage);
        expect(layoutOf(32, { paperSize: 'A3' })).toMatchObject({ sheet: 'A3', usesPaper: true });
        // too big for A3 too: on to A2
        expect(layoutOf(48, { paperSize: 'A3' })).toMatchObject({ sheet: 'A2', usesPaper: false });
    });

    it('fits every card, grid and text inside its page', () => {
        for (const plate of [6, 8, 16, 32, 48])
            for (const brickStuds of [1, 2])
                for (const paperSize of ['A4', 'Letter', 'A3'] as const)
                    for (const bagListColors of [0, 12]) {
                        const l = layoutOf(plate, {
                            brickStuds,
                            paperSize,
                            content: { ...DEFAULT_CARD, bagListColors },
                        });
                        const usedWidth = l.cardWidthMm * l.columns + CARD_GAP_MM * (l.columns - 1);
                        const usedHeight = l.cardHeightMm * l.rows + CARD_GAP_MM * (l.rows - 1);
                        expect(usedWidth).toBeCloseTo(l.pageWidthMm - PAGE_MARGIN_MM * 2);
                        expect(usedHeight).toBeCloseTo(l.pageHeightMm - PAGE_MARGIN_MM * 2);
                        const pad = CARD_TEXT.paddingMm * 2;
                        const gridMm = l.cellMm * Math.floor(plate / brickStuds);
                        expect(gridMm + pad).toBeLessThanOrEqual(l.cardWidthMm);
                        expect(gridMm + pad + l.text.heightMm).toBeLessThanOrEqual(l.cardHeightMm);
                    }
    });

    it('makes room for a bag list, which can cost cards per page', () => {
        const without = layoutOf(8);
        const withBags = layoutOf(8, { content: { ...DEFAULT_CARD, bagListColors: 8 } });
        expect(withBags.text.bagRows).toBeGreaterThan(0);
        expect(withBags.text.heightMm).toBeGreaterThan(without.text.heightMm);
        expect(withBags.cardsPerPage).toBeLessThanOrEqual(without.cardsPerPage);
    });

    it('keeps the messages and bag list as wide as the grid, not the card', () => {
        const l = layoutOf(8, { content: { ...DEFAULT_CARD, bagListColors: 8 } });
        expect(l.cardWidthMm - CARD_TEXT.paddingMm * 2).toBeGreaterThan(l.text.innerMm + 5);
        expect(l.text.innerMm - 8 * STUD_MM).toBeGreaterThanOrEqual(0);
        expect(l.text.innerMm - 8 * STUD_MM).toBeLessThan(1);
    });

    it('fails clearly for a card no sheet can hold', () => {
        expect(() => layoutOf(200)).toThrow("A 200 stud card doesn't fit on any sheet");
    });
});

describe('card text', () => {
    it('estimates lines from length and line breaks, with no lines for no text', () => {
        expect(messageLines('', 50, 2.8)).toBe(0);
        expect(messageLines('   ', 50, 2.8)).toBe(0);
        expect(messageLines('Short', 50, 2.8)).toBe(1);
        expect(messageLines('One\nTwo', 50, 2.8)).toBe(2);
        expect(messageLines('x'.repeat(100), 50, 2.8)).toBeGreaterThan(2);
    });

    it('cuts long messages off at the maximum, and leaves empty parts out', () => {
        const long = cardText({ ...DEFAULT_CARD, topMessage: 'word '.repeat(80), bagListColors: 0 }, 60, 60);
        expect(long.topLines).toBe(MAX_MESSAGE_LINES);
        const bare = cardText({ topMessage: '', bottomMessage: '', clubEvent: '', bagListColors: 0 }, 60, 60);
        expect(bare).toMatchObject({ topLines: 0, bottomLines: 0, bagRows: 0 });
        expect(bare.heightMm).toBeCloseTo(CARD_TEXT.headerMm + CARD_TEXT.gapMm);
    });
});
