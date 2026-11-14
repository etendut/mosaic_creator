import { DEFAULT_CARD } from './project';
import type { CardSize, PaperSize } from './types';
import {
    CARD_GAP_MM,
    CARD_TEXT,
    cardLayout,
    cardText,
    type CardContent,
    COMPACT_CELL_MIN_MM,
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
                for (const size of ['real', 'compact'] as const)
                    fits(
                        mapPageLayout(
                            cardLayout({
                                plateStuds: plate,
                                brickStuds: 1,
                                paperSize: 'A4',
                                size,
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
    const SHORT = { topMessage: '', bottomMessage: '', clubEvent: '', bagListColors: 0 };
    const layoutOf = (
        plateStuds: number,
        size: CardSize,
        {
            brickStuds = 1,
            paperSize = 'A4' as PaperSize,
            content = { ...DEFAULT_CARD, bagListColors: 0 } as CardContent,
        } = {},
    ) => cardLayout({ plateStuds, brickStuds, paperSize, size, content });

    it.each([
        [6, 10],
        [8, 8],
        [16, 2],
    ])('real size: %i stud cards, cells the size of the brick, %i per A4', (plate, perPage) => {
        const l = layoutOf(plate, 'real');
        expect(l.cardsPerPage).toBeGreaterThanOrEqual(perPage);
        expect(l.cellMm).toBeGreaterThanOrEqual(STUD_MM * 0.94);
        expect(l.cellMm).toBeLessThanOrEqual(STUD_MM);
        expect(l.sheet).toBe('A4');
    });

    it('compact: more cards per page, cells never under 6 mm', () => {
        expect(layoutOf(6, 'compact').cardsPerPage).toBeGreaterThanOrEqual(16);
        expect(layoutOf(6, 'compact', { content: { ...SHORT, bagListColors: 0 } }).cardsPerPage).toBeGreaterThanOrEqual(
            18,
        );
        for (const plate of [6, 8, 16, 32])
            expect(layoutOf(plate, 'compact').cellMm).toBeGreaterThanOrEqual(COMPACT_CELL_MIN_MM);
    });

    it('sizes 2×2 brick cards per brick, not per stud', () => {
        const real = layoutOf(8, 'real', { brickStuds: 2 });
        expect(real.cellMm).toBeGreaterThan(15);
        expect(layoutOf(8, 'compact', { brickStuds: 2 }).cardsPerPage).toBeGreaterThanOrEqual(24);
    });

    it('moves big plates to A3/A2 when they need it, and says the paper choice no longer applies', () => {
        expect(layoutOf(32, 'real')).toMatchObject({ sheet: 'A3', usesPaper: false, cardsPerPage: 1 });
        expect(layoutOf(48, 'real')).toMatchObject({ sheet: 'A2', usesPaper: false });
        // compact fits a 32 stud card on the paper itself
        expect(layoutOf(32, 'compact')).toMatchObject({ sheet: 'A4', usesPaper: true });
        expect(layoutOf(8, 'real', { paperSize: 'Letter' }).label).toMatch(/^Letter/);
    });

    it('never fits fewer cards per page in compact than in real size', () => {
        for (const plate of [6, 8, 16, 32, 48])
            for (const brickStuds of [1, 2])
                expect(layoutOf(plate, 'compact', { brickStuds }).cardsPerPage).toBeGreaterThanOrEqual(
                    layoutOf(plate, 'real', { brickStuds }).cardsPerPage,
                );
    });

    it('fits every card, grid and text inside its page', () => {
        for (const plate of [6, 8, 16, 32, 48])
            for (const brickStuds of [1, 2])
                for (const paperSize of ['A4', 'Letter'] as const)
                    for (const size of ['real', 'compact'] as const)
                        for (const bagListColors of [0, 12]) {
                            const l = layoutOf(plate, size, {
                                brickStuds,
                                paperSize,
                                content: { ...DEFAULT_CARD, bagListColors },
                            });
                            const usedWidth = l.cardWidthMm * l.columns + CARD_GAP_MM * (l.columns - 1);
                            const usedHeight = l.cardHeightMm * l.rows + CARD_GAP_MM * (l.rows - 1);
                            expect(usedWidth).toBeCloseTo(l.pageWidthMm - PAGE_MARGIN_MM * 2);
                            expect(usedHeight).toBeCloseTo(l.pageHeightMm - PAGE_MARGIN_MM * 2);
                            const pad = CARD_TEXT[size].paddingMm * 2;
                            const gridMm = l.cellMm * Math.floor(plate / brickStuds);
                            expect(gridMm + pad).toBeLessThanOrEqual(l.cardWidthMm);
                            expect(gridMm + pad + l.text.heightMm).toBeLessThanOrEqual(l.cardHeightMm);
                        }
    });

    it('makes room for a bag list, which can cost cards per page', () => {
        const without = layoutOf(8, 'real');
        const withBags = layoutOf(8, 'real', { content: { ...DEFAULT_CARD, bagListColors: 8 } });
        expect(withBags.text.bagRows).toBeGreaterThan(0);
        expect(withBags.text.heightMm).toBeGreaterThan(without.text.heightMm);
        expect(withBags.cardsPerPage).toBeLessThanOrEqual(without.cardsPerPage);
    });

    it('fails clearly for a card no sheet can hold', () => {
        expect(() => layoutOf(200, 'real')).toThrow("A 200 stud card doesn't fit on any sheet");
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
        const long = cardText({ ...DEFAULT_CARD, topMessage: 'word '.repeat(80), bagListColors: 0 }, 60, 'real');
        expect(long.topLines).toBe(MAX_MESSAGE_LINES);
        const bare = cardText({ topMessage: '', bottomMessage: '', clubEvent: '', bagListColors: 0 }, 60, 'real');
        expect(bare).toMatchObject({ topLines: 0, bottomLines: 0, bagRows: 0 });
        expect(bare.heightMm).toBeCloseTo(CARD_TEXT.real.headerMm + CARD_TEXT.real.gapMm);
    });

    it('uses smaller type for compact cards', () => {
        const content = { ...DEFAULT_CARD, bagListColors: 6 };
        expect(cardText(content, 60, 'compact').heightMm).toBeLessThan(cardText(content, 60, 'real').heightMm);
    });
});
