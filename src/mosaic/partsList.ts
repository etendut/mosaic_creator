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

/** Exact part counts for the mosaic: bricks per colour, one plate per card, plus pins for plates that need them. */
export const buildPartsList = (
    cards: MosaicCard[],
    brick: BrickOption,
    plate: PlateOption,
    pin: PinOption,
): PartLine[] => {
    const byColor = new Map<number, PartLine>();
    for (const card of cards) {
        for (const row of card.rows) {
            for (const cell of row) {
                if (!cell) continue;
                const line = byColor.get(cell.id);
                if (line) line.quantity++;
                else byColor.set(cell.id, { partId: brick.partId, name: brick.name, color: cell, quantity: 1 });
            }
        }
    }
    const lines = [...byColor.values()].sort(
        (a, b) => b.quantity - a.quantity || a.color.name.localeCompare(b.color.name),
    );

    if (cards.length > 0) {
        lines.push({ partId: plate.partId, name: plate.name, color: plate.color, quantity: cards.length });
        if (plate.pinsPerPlate > 0)
            lines.push({
                partId: pin.partId,
                name: pin.name,
                color: pin.color,
                quantity: cards.length * plate.pinsPerPlate,
            });
    }
    return lines;
};
