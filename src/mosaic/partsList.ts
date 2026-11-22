import type { BrickOption, MosaicCard, PaletteColor, PinOption, PlateOption } from './types';

export interface PartLine {
    partId: string;
    name: string;
    color: PaletteColor;
    quantity: number;
    /** Extra bricks allowed for losses, already counted in `quantity`. */
    spares?: number;
}

/** Spares for one line: the percentage rounded up, so every line gets at least one when spares are on. */
export const sparesFor = (quantity: number, percent: number) =>
    percent > 0 ? Math.ceil((quantity * percent) / 100) : 0;

/**
 * The lines to buy: each line grows by `percent` spares, rounded up, except the plates (one per card, and big
 * enough not to go missing). The exact counts stay what the cards show.
 */
export const withSpares = (lines: PartLine[], percent: number, platePartId: string): PartLine[] =>
    lines.map((line) => {
        const spares = line.partId === platePartId ? 0 : sparesFor(line.quantity, percent);
        return { ...line, quantity: line.quantity + spares, spares };
    });

/** The mosaic's own brick lines: one per colour used, with its count. */
export const colorsUsed = (parts: PartLine[], brickPartId: string) =>
    parts.filter((line) => line.partId === brickPartId);

/** How many joins there are between neighbouring cards laid out `columns` across: each row's, then each column's. */
export const cardJoins = (cardCount: number, columns: number) => {
    if (cardCount === 0 || columns === 0) return 0;
    const rows = Math.ceil(cardCount / columns);
    return rows * (columns - 1) + columns * (rows - 1);
};

/**
 * Exact part counts for the mosaic: bricks per colour, one plate per card, plus pins for plates that need them, the
 * plate's pins for each join between neighbouring cards (`columns`: cards across).
 */
export const buildPartsList = (
    cards: MosaicCard[],
    columns: number,
    brick: BrickOption,
    plate: PlateOption,
    pin: PinOption,
): PartLine[] => {
    const byColor = new Map<number, PartLine>();
    for (const cell of cards.flatMap((card) => card.rows.flat())) {
        if (!cell) continue;
        const line = byColor.get(cell.id);
        if (line) line.quantity++;
        else byColor.set(cell.id, { partId: brick.partId, name: brick.name, color: cell, quantity: 1 });
    }
    const lines = [...byColor.values()].sort(
        (a, b) => b.quantity - a.quantity || a.color.name.localeCompare(b.color.name),
    );

    if (cards.length > 0) {
        lines.push({ partId: plate.partId, name: plate.name, color: plate.color, quantity: cards.length });
        const pins = cardJoins(cards.length, columns) * plate.pinsPerJoin;
        if (pins > 0) lines.push({ partId: pin.partId, name: pin.name, color: pin.color, quantity: pins });
    }
    return lines;
};
