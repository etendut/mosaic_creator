import type { Cell, MosaicCard, PixelGrid } from './types';

/** Spreadsheet-style label for a 1-based index: 1 → A, 26 → Z, 27 → AA. */
export const rowLabel = (n: number): string => {
    let label = '';
    for (let rest = n; rest > 0; rest = Math.floor((rest - 1) / 26)) {
        label = String.fromCharCode(65 + ((rest - 1) % 26)) + label;
    }
    return label;
};

/** How many mosaic cells (bricks) fit along one side of a card. */
export const cellsPerCard = (plateSize: number, brickSize: number) => Math.floor(plateSize / brickSize);

export const cardGridSize = (grid: Pick<PixelGrid, 'width' | 'height'>, cellsPerSide: number) => ({
    columns: Math.ceil(grid.width / cellsPerSide),
    rows: Math.ceil(grid.height / cellsPerSide),
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
            const cardRows: Cell[][] = [];
            let brickCount = 0;
            for (let y = 0; y < cellsPerSide; y++) {
                const source = grid.rows[cardRow * cellsPerSide + y];
                const row: Cell[] = [];
                for (let x = 0; x < cellsPerSide; x++) {
                    const cell = source?.[cardCol * cellsPerSide + x] ?? null;
                    if (cell) brickCount++;
                    row.push(cell);
                }
                cardRows.push(row);
            }
            if (brickCount > 0)
                cards.push({ id: `${rowLabel(cardRow + 1)}${cardCol + 1}`, rows: cardRows, brickCount });
        }
    }
    return cards;
};
