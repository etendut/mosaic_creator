import type { MosaicCard, PixelGrid, PlateOption } from './types';
import { formatLength, studsToMm } from './units';

/** One fact about the mosaic: a label and its value, for a step's Info and the printed map page. */
export type Fact = [label: string, value: string];

/** The numbers an organiser plans around: cards, bricks, the mosaic's size in bricks and when built. */
export const mosaicFacts = (mosaic: {
    grid: Pick<PixelGrid, 'width' | 'height'> | null;
    cardGrid: { columns: number; rows: number };
    cards: Pick<MosaicCard, 'brickCount'>[];
    plate: Pick<PlateOption, 'size'>;
}): Fact[] => {
    const { grid, cardGrid, cards, plate } = mosaic;
    if (!grid) return [];
    const bricks = cards.reduce((sum, card) => sum + card.brickCount, 0);
    return [
        ['Cards', `${cards.length.toLocaleString()} (${cardGrid.columns} × ${cardGrid.rows})`],
        ['Bricks', bricks.toLocaleString()],
        ['Mosaic', `${grid.width} × ${grid.height} bricks`],
        [
            'Finished size',
            `${formatLength(studsToMm(cardGrid.columns * plate.size))} × ${formatLength(studsToMm(cardGrid.rows * plate.size))}`,
        ],
    ];
};
