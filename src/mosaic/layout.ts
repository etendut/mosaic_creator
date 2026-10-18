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
