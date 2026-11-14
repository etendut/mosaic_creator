import type { CardSize, PaperSize } from './types';

export const PAGE_MARGIN_MM = 5;
export const CARD_GAP_MM = 2;

const SHEETS = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
    A3: { width: 297, height: 420 },
    A2: { width: 420, height: 594 },
};
type Sheet = keyof typeof SHEETS;

/**
 * The type scale of a card, in mm. BuildingCard draws with these same numbers, so the space the layout reserves is
 * the space the card uses; mm rather than px so print and preview match. Compact cards use smaller type.
 */
export const CARD_TEXT = {
    real: {
        paddingMm: 3,
        /** Between the blocks stacked on a card (header, messages, grid, bag list, footer). */
        gapMm: 1.2,
        /** The card id and title. */
        headerMm: 6,
        idFontMm: 5,
        fontMm: 2.8,
        lineMm: 3.5,
        footerMm: 3.5,
        bagRowMm: 4.5,
        bagEntryMm: 13,
        bagFontMm: 2.4,
    },
    compact: {
        paddingMm: 2,
        gapMm: 0.8,
        headerMm: 4.5,
        idFontMm: 3.8,
        fontMm: 2.2,
        lineMm: 2.75,
        footerMm: 2.75,
        bagRowMm: 3.8,
        bagEntryMm: 11,
        bagFontMm: 2,
    },
} as const;
export type CardTextStyle = (typeof CARD_TEXT)[CardSize];

/** Longer messages are cut off with an ellipsis; the cards step warns about it. */
export const MAX_MESSAGE_LINES = 3;
export const BAG_GAP_MM = 1;

/** A stud is 8 mm; "real size" prints each cell the size of the brick, so bricks can be laid on the card. */
export const STUD_MM = 8;
/** Real size allows a little shrink (cards used to print at 7.9 mm) so a card isn't pushed onto a bigger sheet. */
const REAL_SIZE_MIN = 0.94;
/** Smallest cell in compact cards: the colour id in it is still about 2.4 mm tall. */
export const COMPACT_CELL_MIN_MM = 6;

/** Average glyph width as a share of the font size; generous, so line estimates err towards more lines. */
const CHAR_WIDTH = 0.55;

/** Lines a message needs at a given width and font size (each line break starts a line), before any cut-off. */
export const messageLines = (text: string, widthMm: number, fontMm: number) => {
    if (!text.trim()) return 0;
    const perLine = Math.max(1, Math.floor(widthMm / (fontMm * CHAR_WIDTH)));
    return text
        .trim()
        .split('\n')
        .reduce((lines, paragraph) => lines + Math.max(1, Math.ceil(paragraph.length / perLine)), 0);
};

export interface CardContent {
    topMessage: string;
    bottomMessage: string;
    clubEvent: string;
    /** Most colours on any one card, when the bag list is shown; 0 for no bag list. */
    bagListColors: number;
}

/** How a card's text is laid out at a given card width and size, and how tall it is in total. */
export const cardText = (content: CardContent, cardWidthMm: number, size: CardSize) => {
    const t = CARD_TEXT[size];
    const innerMm = cardWidthMm - t.paddingMm * 2;
    const lines = (text: string) => Math.min(MAX_MESSAGE_LINES, messageLines(text, innerMm, t.fontMm));
    const topLines = lines(content.topMessage);
    const bottomLines = lines(content.bottomMessage);
    const bagColumns = Math.max(1, Math.floor((innerMm + BAG_GAP_MM) / (t.bagEntryMm + BAG_GAP_MM)));
    const bagRows = Math.ceil(content.bagListColors / bagColumns);
    const blocks = [
        t.headerMm,
        topLines * t.lineMm,
        bottomLines * t.lineMm,
        bagRows * t.bagRowMm,
        content.clubEvent.trim() ? t.footerMm : 0,
    ].filter((mm) => mm > 0);
    // the grid is a block too, so there is a gap after every text block
    const heightMm = blocks.reduce((sum, mm) => sum + mm, 0) + blocks.length * t.gapMm;
    return { innerMm, topLines, bottomLines, bagColumns, bagRows, heightMm };
};

export interface PageLayout {
    /** Human readable, e.g. "A4 landscape". */
    label: string;
    sheet: Sheet;
    pageWidthMm: number;
    pageHeightMm: number;
    columns: number;
    rows: number;
    cardsPerPage: number;
    cardWidthMm: number;
    cardHeightMm: number;
}

export interface CardLayout extends PageLayout {
    /** Whether the paper size setting decides the sheet (false when the cards need A3/A2). */
    usesPaper: boolean;
    /** One cell of the grid: one brick. */
    cellMm: number;
    text: ReturnType<typeof cardText>;
}

const page = (sheet: Sheet, landscape: boolean, columns: number, rows: number): PageLayout => {
    const { width, height } = SHEETS[sheet];
    const pageWidthMm = landscape ? height : width;
    const pageHeightMm = landscape ? width : height;
    const printableWidth = pageWidthMm - PAGE_MARGIN_MM * 2;
    const printableHeight = pageHeightMm - PAGE_MARGIN_MM * 2;
    return {
        label: `${sheet} ${landscape ? 'landscape' : 'portrait'}`,
        sheet,
        pageWidthMm,
        pageHeightMm,
        columns,
        rows,
        cardsPerPage: columns * rows,
        cardWidthMm: (printableWidth - CARD_GAP_MM * (columns - 1)) / columns,
        cardHeightMm: (printableHeight - CARD_GAP_MM * (rows - 1)) / rows,
    };
};

/** A little room for the grid's 1px border lines. */
const GRID_BORDER_MM = 0.6;
const MAX_PER_SIDE = 12;

/**
 * How to print the cards: the sheet, orientation and number of cards across and down that fit the most cards per
 * page, with cells no smaller than the size allows. Tries the user's paper first, then A3 and A2 for cards too big
 * for it. Ties go to bigger cells.
 */
export const cardLayout = (options: {
    plateStuds: number;
    brickStuds: number;
    paperSize: PaperSize;
    size: CardSize;
    content: CardContent;
}): CardLayout => {
    const { plateStuds, brickStuds, paperSize, size, content } = options;
    const cells = Math.floor(plateStuds / brickStuds);
    const realMm = STUD_MM * brickStuds;
    const minMm = size === 'real' ? realMm * REAL_SIZE_MIN : Math.min(realMm, COMPACT_CELL_MIN_MM);

    const sheets: Sheet[] = [paperSize, 'A3', 'A2'];
    for (const sheet of sheets) {
        let best: CardLayout | null = null;
        for (const landscape of [false, true])
            for (let columns = 1; columns <= MAX_PER_SIDE; columns++)
                for (let rows = 1; rows <= MAX_PER_SIDE; rows++) {
                    const p = page(sheet, landscape, columns, rows);
                    const text = cardText(content, p.cardWidthMm, size);
                    const gridMm = Math.min(
                        p.cardWidthMm - CARD_TEXT[size].paddingMm * 2,
                        p.cardHeightMm - CARD_TEXT[size].paddingMm * 2 - text.heightMm,
                    );
                    const cellMm = Math.min(realMm, (gridMm - GRID_BORDER_MM) / cells);
                    if (cellMm < minMm) continue;
                    const better =
                        !best ||
                        p.cardsPerPage > best.cardsPerPage ||
                        (p.cardsPerPage === best.cardsPerPage && cellMm > best.cellMm + 1e-9);
                    if (better) best = { ...p, usesPaper: sheet === paperSize, cellMm, text };
                }
        if (best) return best;
    }
    throw new Error(`A ${plateStuds} stud card doesn't fit on any sheet`);
};

/** Fixed heights on the map page, so the space left for the map is known before anything is laid out. */
export const MAP_HEADER_MM = 24;
/** Kept free at the foot of the map page so rounding in the print engine can't push anything onto a second page. */
const MAP_PAGE_SLACK_MM = 1;
export const LEGEND_ROW_MM = 7;
const LEGEND_COLUMN_MIN_MM = 50;
export const MAP_PAGE_GAP_MM = 3;

export interface MapPageLayout {
    label: string;
    pageWidthMm: number;
    pageHeightMm: number;
    /** The printable area inside the page margin (less a little slack at the foot). */
    contentWidthMm: number;
    contentHeightMm: number;
    legendColumns: number;
    legendRows: number;
    /** The map image, scaled to fill what the header and legend leave without changing its shape. */
    mapWidthMm: number;
    mapHeightMm: number;
}

type Page = Pick<PageLayout, 'label' | 'pageWidthMm' | 'pageHeightMm'>;

/** A page of the paper size turned to match the mosaic: landscape when it is wider than tall. */
export const pageForMosaic = (paperSize: PaperSize, mosaic: { width: number; height: number }): Page => {
    const landscape = mosaic.width >= mosaic.height;
    const { width, height } = SHEETS[paperSize];
    return {
        label: `${paperSize} ${landscape ? 'landscape' : 'portrait'}`,
        pageWidthMm: landscape ? height : width,
        pageHeightMm: landscape ? width : height,
    };
};

/**
 * The one-page card map on `page`: header, colour legend, then the map as large as fits. Every size is worked out
 * here in mm rather than left to flexbox, because mobile print engines don't reliably stretch a canvas to fill
 * leftover space.
 */
export const mapPageLayout = (
    page: Page,
    mosaic: { width: number; height: number },
    colorCount: number,
): MapPageLayout => {
    const { label, pageWidthMm, pageHeightMm } = page;
    const contentWidthMm = pageWidthMm - PAGE_MARGIN_MM * 2;
    const contentHeightMm = pageHeightMm - PAGE_MARGIN_MM * 2 - MAP_PAGE_SLACK_MM;

    const legendColumns = Math.max(1, Math.floor(contentWidthMm / LEGEND_COLUMN_MIN_MM));
    const legendRows = Math.ceil(colorCount / legendColumns);
    const legendMm = legendRows * LEGEND_ROW_MM;
    const mapSpaceMm = contentHeightMm - MAP_HEADER_MM - legendMm - MAP_PAGE_GAP_MM * (legendRows > 0 ? 2 : 1);

    const aspect = mosaic.height > 0 ? mosaic.width / mosaic.height : 1;
    const mapWidthMm = Math.max(0, Math.min(contentWidthMm, mapSpaceMm * aspect));
    return {
        label,
        pageWidthMm,
        pageHeightMm,
        contentWidthMm,
        contentHeightMm,
        legendColumns,
        legendRows,
        mapWidthMm,
        mapHeightMm: mapWidthMm / aspect,
    };
};

export const mmToPx = (mm: number) => (mm / 25.4) * 96;
