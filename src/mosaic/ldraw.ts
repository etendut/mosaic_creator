import ldraw from '../data/ldraw.json';
import type { BrickOption, MosaicCard, PlateOption } from './types';

/**
 * A mosaic as an LDraw model, for BrickLink Studio (or any LDraw editor): one .mpd file with a submodel per card, a
 * backing plate with its bricks on top, and a main model that lays the cards out as the finished mosaic. In Studio
 * each card is then its own model, ready for its instruction maker.
 *
 * LDraw units: a stud is 20 wide; a plate or tile is 8 high and a brick 24. A part's origin is the centre of its top
 * face, its body below it (+y is down), so a brick sits on a plate at y = −(its height). Part files and colour codes
 * come from src/data/ldraw.json (scripts/build-ldraw.mjs).
 */

const STUD = 20;
/** How far a brick's top sits above the plate it stands on: its own height. */
const HEIGHT: Record<BrickOption['profile'], number> = { brick: 24, plate: 8, tile: 8, baseplate: 8, technic: 32 };
/** The most bricks in one model: past this, Studio slows to a crawl (a 96 × 96 mosaic is about 9,000). */
export const MAX_LDRAW_BRICKS = 25_000;

const parts = ldraw.parts as Record<string, string>;
const colors = ldraw.colors as Record<string, number>;

const part = (partId: string) => {
    const file = parts[partId];
    if (!file) throw new Error(`No LDraw part for BrickLink part ${partId}`);
    return file;
};
const color = (id: number) => {
    const code = colors[id];
    if (code === undefined) throw new Error(`No LDraw colour for BrickLink colour ${id}`);
    return code;
};

/** One part, unrotated: LDraw's type 1 line (colour, position, the identity matrix, the file). */
const place = (code: number, x: number, y: number, z: number, file: string) =>
    `1 ${code} ${x} ${y} ${z} 1 0 0 0 1 0 0 0 1 ${file}`;

/** A card's submodel file name, as Studio lists it: card-a1.ldr. */
export const cardFile = (id: string) => `card-${id.toLowerCase()}.ldr`;

/** An LDraw model file's header: the description line, then its name and author. */
const header = (description: string, name: string) => [
    `0 FILE ${name}`,
    `0 ${description}`,
    `0 Name: ${name}`,
    '0 Author: Mosaic Creator',
];

/** The model file's name, from the title: "Library Day" → "Library Day.mpd". */
export const ldrawFileName = (title: string) => `${title.replace(/[\\/:*?"<>|]+/g, '').trim() || 'mosaic'}.mpd`;

export const toLdraw = ({
    title,
    cards,
    columns,
    brick,
    plate,
}: {
    title: string;
    cards: MosaicCard[];
    /** Cards across: the cards come row by row. */
    columns: number;
    brick: Pick<BrickOption, 'partId' | 'size' | 'profile'>;
    plate: Pick<PlateOption, 'partId' | 'size' | 'color'>;
}) => {
    const bricks = cards.reduce((sum, card) => sum + card.brickCount, 0);
    if (bricks > MAX_LDRAW_BRICKS)
        throw new Error(
            `This mosaic has ${bricks.toLocaleString('en-GB')} bricks, too many for one model: make it ${MAX_LDRAW_BRICKS.toLocaleString('en-GB')} or fewer.`,
        );
    const brickFile = part(brick.partId);
    const plateFile = part(plate.partId);
    const plateColor = color(plate.color.id);
    const span = plate.size * STUD;
    const lines = header(title || 'Mosaic', 'mosaic.ldr');
    // the finished mosaic: each card where it goes, in its own colours (16: as the submodel says)
    cards.forEach((card, i) => {
        const [x, z] = [(i % columns) * span, Math.floor(i / columns) * span];
        lines.push(place(16, x, 0, z, cardFile(card.id)));
    });
    lines.push('0 NOFILE');
    for (const card of cards) {
        lines.push(...header(`Card ${card.id}`, cardFile(card.id)));
        // the backing plate, its corner at the card's corner
        lines.push(place(plateColor, span / 2, 0, span / 2, plateFile));
        card.rows.forEach((row, r) =>
            row.forEach((cell, c) => {
                if (!cell) return;
                const centre = (n: number) => (n * brick.size + brick.size / 2) * STUD;
                lines.push(place(color(cell.id), centre(c), -HEIGHT[brick.profile], centre(r), brickFile));
            }),
        );
        lines.push('0 NOFILE');
    }
    return `${lines.join('\r\n')}\r\n`;
};
