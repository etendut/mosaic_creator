import type { Cell, MosaicCard, PaletteColor, PixelGrid } from './types';

/** Spreadsheet-style label for a 1-based index: 1 → A, 26 → Z, 27 → AA. */
export const rowLabel = (n: number): string => {
    let label = '';
    for (let rest = n; rest > 0; rest = Math.floor((rest - 1) / 26)) {
        label = String.fromCharCode(65 + ((rest - 1) % 26)) + label;
    }
    return label;
};

/** The bricks one card needs, per colour, by colour id: the number printed on each brick, so it's quick to find. */
export const cardColorCounts = (card: MosaicCard) => {
    const counts = new Map<number, { color: PaletteColor; count: number }>();
    for (const row of card.rows)
        for (const cell of row) {
            if (!cell) continue;
            const entry = counts.get(cell.id);
            if (entry) entry.count++;
            else counts.set(cell.id, { color: cell, count: 1 });
        }
    return [...counts.values()].sort((a, b) => a.color.id - b.color.id);
};

/** How many mosaic cells (bricks) fit along one side of a card. */
export const cellsPerCard = (plateSize: number, brickSize: number) => Math.floor(plateSize / brickSize);

export const cardGridSize = (grid: Pick<PixelGrid, 'width' | 'height'>, cellsPerSide: number) => ({
    columns: Math.ceil(grid.width / cellsPerSide),
    rows: Math.ceil(grid.height / cellsPerSide),
});

/** One card's square of cells, empty (null) past the edge of the grid. */
const cardCells = (grid: PixelGrid, cellsPerSide: number, cardRow: number, cardCol: number): Cell[][] =>
    Array.from({ length: cellsPerSide }, (_, y) => {
        const source = grid.rows[cardRow * cellsPerSide + y];
        return Array.from({ length: cellsPerSide }, (_, x) => source?.[cardCol * cellsPerSide + x] ?? null);
    });

/**
 * Split the grid into plate-sized building cards, left-to-right then top-to-bottom. Cards that would be entirely
 * empty are skipped, but keep their position in the id sequence so ids match the preview overlay.
 */
export const compileMosaicCards = (grid: PixelGrid, cellsPerSide: number): MosaicCard[] => {
    const { columns, rows } = cardGridSize(grid, cellsPerSide);
    const cards: MosaicCard[] = [];

    for (let cardRow = 0; cardRow < rows; cardRow++) {
        for (let cardCol = 0; cardCol < columns; cardCol++) {
            const cardRows = cardCells(grid, cellsPerSide, cardRow, cardCol);
            const brickCount = cardRows.flat().filter(Boolean).length;
            if (brickCount > 0)
                cards.push({ id: `${rowLabel(cardRow + 1)}${cardCol + 1}`, rows: cardRows, brickCount });
        }
    }
    return cards;
};
