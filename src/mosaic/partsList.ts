import type { BrickOption, MosaicCard, PaletteColor, PinOption, PlateOption } from './types';

export interface PartLine {
    partId: string;
    name: string;
    color: PaletteColor;
    quantity: number;
}

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
