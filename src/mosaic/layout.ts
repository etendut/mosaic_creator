import type { PaperSize } from './types';

export const PAGE_MARGIN_MM = 5;
export const CARD_GAP_MM = 2;

const SHEETS = {
    A4: { width: 210, height: 297 },
    Letter: { width: 215.9, height: 279.4 },
    A3: { width: 297, height: 420 },
    A2: { width: 420, height: 594 },
};
type Sheet = keyof typeof SHEETS;

export interface PageLayout {
    /** Human readable, e.g. "A4 landscape". */
    label: string;
    pageWidthMm: number;
    pageHeightMm: number;
    columns: number;
    rows: number;
    cardsPerPage: number;
    cardWidthMm: number;
    cardHeightMm: number;
}

const layout = (sheet: Sheet, landscape: boolean, columns: number, rows: number): PageLayout => {
    const { width, height } = SHEETS[sheet];
    const pageWidthMm = landscape ? height : width;
    const pageHeightMm = landscape ? width : height;
    const printableWidth = pageWidthMm - PAGE_MARGIN_MM * 2;
    const printableHeight = pageHeightMm - PAGE_MARGIN_MM * 2;
    return {
        label: `${sheet} ${landscape ? 'landscape' : 'portrait'}`,
        pageWidthMm,
        pageHeightMm,
        columns,
        rows,
        cardsPerPage: columns * rows,
        cardWidthMm: (printableWidth - CARD_GAP_MM * (columns - 1)) / columns,
        cardHeightMm: (printableHeight - CARD_GAP_MM * (rows - 1)) / rows,
    };
};

/**
 * Print layout for a plate size on a paper size. 32 and 48 stud plates are too big for A4/Letter and always
 * print one card per A3/A2 sheet.
 */
export const pageLayout = (plateSize: number, paperSize: PaperSize): PageLayout => {
    switch (plateSize) {
        case 6:
            return layout(paperSize, false, 3, 2);
        case 8:
            return layout(paperSize, false, 2, 2);
        case 32:
            return layout('A3', false, 1, 1);
        case 48:
            return layout('A2', false, 1, 1);
        case 16:
        default:
            return layout(paperSize, true, 2, 1);
    }
};

/** Whether the user's paper size choice affects this plate size. */
export const usesPaperSize = (plateSize: number) => plateSize !== 32 && plateSize !== 48;

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

/**
 * The one-page card map: header, colour legend, then the map as large as fits. Landscape when the mosaic is wider
 * than tall. Every size is worked out here in mm rather than left to flexbox, because mobile print engines don't
 * reliably stretch a canvas to fill leftover space.
 */
export const mapPageLayout = (
    paperSize: PaperSize | Sheet,
    mosaic: { width: number; height: number },
    colorCount: number,
): MapPageLayout => {
    const landscape = mosaic.width >= mosaic.height;
    const { width, height } = SHEETS[paperSize];
    const pageWidthMm = landscape ? height : width;
    const pageHeightMm = landscape ? width : height;
    const contentWidthMm = pageWidthMm - PAGE_MARGIN_MM * 2;
    const contentHeightMm = pageHeightMm - PAGE_MARGIN_MM * 2 - MAP_PAGE_SLACK_MM;

    const legendColumns = Math.max(1, Math.floor(contentWidthMm / LEGEND_COLUMN_MIN_MM));
    const legendRows = Math.ceil(colorCount / legendColumns);
    const legendMm = legendRows * LEGEND_ROW_MM;
    const mapSpaceMm = contentHeightMm - MAP_HEADER_MM - legendMm - MAP_PAGE_GAP_MM * (legendRows > 0 ? 2 : 1);

    const aspect = mosaic.height > 0 ? mosaic.width / mosaic.height : 1;
    const mapWidthMm = Math.max(0, Math.min(contentWidthMm, mapSpaceMm * aspect));
    return {
        label: `${paperSize} ${landscape ? 'landscape' : 'portrait'}`,
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

/** Card height reserved for the title, id, messages and footer text. */
const CARD_TEXT_PX = 220;
const CARD_PADDING_PX = 16;
const MAX_STUD_PX = 30;

/** Size of one stud on a card's grid so `studs` fit inside the card alongside its text. */
export const studPxForCard = (cardWidthPx: number, cardHeightPx: number, studs: number) =>
    Math.max(
        4,
        Math.min(
            MAX_STUD_PX,
            Math.floor((cardWidthPx - CARD_PADDING_PX) / studs),
            Math.floor((cardHeightPx - CARD_TEXT_PX) / studs),
        ),
    );
