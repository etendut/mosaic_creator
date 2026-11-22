import ldraw from '../data/ldraw.json';
import type { BrickOption, MosaicCard, PinOption, PlateOption } from './types';

/**
 * A mosaic as an LDraw model, for BrickLink Studio (or any LDraw editor): one .mpd file with a submodel per card, a
 * backing plate with its bricks on top, and a main model that lays the cards out as the finished mosaic. In Studio
 * each card is then its own model, ready for its instruction maker.
 *
 * LDraw units: a stud is 20 wide; a plate or tile is 8 high and a brick 24. A part's origin is the centre of its top
 * face, its body below it (+y is down), so a brick sits on a plate at y = −(its height). Looking down on the studs,
 * LDraw's +z runs the other way to the picture's rows, so rows run from +z to −z: a mosaic laid out with z
 * increasing top to bottom came out upside down (mirrored) in Studio. Part files and colour codes come from src/data/ldraw.json
 * (scripts/build-ldraw.mjs).
 */

const STUD = 20;
/** How far a brick's top sits above the plate it stands on: its own height. */
const HEIGHT: Record<BrickOption['profile'], number> = { brick: 24, plate: 8, tile: 8, baseplate: 8, technic: 32 };
/**
 * The most bricks in one model. Studio has no limit of its own: people report models of over 60,000 parts working,
 * and renders past 120,000 bricks; beyond that it gets too slow to use. The app's biggest mosaics run to millions.
 */
export const MAX_LDRAW_BRICKS = 120_000;

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

/** Unrotated, and turned a quarter about the vertical (a pin joining rows rather than columns). */
const UPRIGHT = '1 0 0 0 1 0 0 0 1';
const QUARTER_TURN = '0 0 1 0 1 0 -1 0 0';

/** One part: LDraw's type 1 line (colour, position, rotation, the file). */
const place = (code: number, x: number, y: number, z: number, file: string, rotation = UPRIGHT) =>
    `1 ${code} ${x} ${y} ${z} ${rotation} ${file}`;

/**
 * Where pins go along an edge two pinned plates share (the 16 × 16 Technic brick), as built in Studio: through the
 * side holes 18 below the top face, at the middle of the edge and 5 studs either side of it.
 */
const PIN_DEPTH = 18;
const PIN_OFFSETS = [-100, 0, 100];

/** A card's submodel file name, as Studio lists it: card-a1.ldr. */
export const cardFile = (id: string) => `card-${id.toLowerCase()}.ldr`;

/** An LDraw model file's header: the description line, then its name and author. */
const header = (description: string, name: string) => [
    `0 FILE ${name}`,
    `0 ${description}`,
    `0 Name: ${name}`,
    '0 Author: Mosaic Creator',
];

export const toLdraw = ({
    title,
    cards,
    columns,
    brick,
    plate,
    pin,
}: {
    title: string;
    cards: MosaicCard[];
    /** Cards across: the cards come row by row. */
    columns: number;
    brick: Pick<BrickOption, 'partId' | 'size' | 'profile'>;
    plate: Pick<PlateOption, 'partId' | 'size' | 'color' | 'pinsPerJoin'>;
    /** The pin that joins pinned plates. */
    pin: Pick<PinOption, 'partId' | 'color'>;
}) => {
    const bricks = cards.reduce((sum, card) => sum + card.brickCount, 0);
    if (bricks > MAX_LDRAW_BRICKS)
        throw new Error(
            `This mosaic has ${bricks.toLocaleString('en-GB')} bricks, more than Studio can work with (about ${MAX_LDRAW_BRICKS.toLocaleString('en-GB')}). Use fewer plates across on the Bricks step to download it for Studio.`,
        );
    const brickFile = part(brick.partId);
    const plateFile = part(plate.partId);
    const plateColor = color(plate.color.id);
    const span = plate.size * STUD;
    const rows = Math.ceil(cards.length / columns);
    const lines = header(title || 'Mosaic', 'mosaic.ldr');
    // the finished mosaic: each card where it goes, in its own colours (16: as the submodel says)
    cards.forEach((card, i) => {
        // the first row at +z, so the picture reads top to bottom looking down on the studs
        const [x, z] = [(i % columns) * span, (rows - 1 - Math.floor(i / columns)) * span];
        lines.push(place(16, x, 0, z, cardFile(card.id)));
    });
    // pinned plates: pins along each edge two cards share, to the next card across and to the one below
    if (plate.pinsPerJoin > 0) {
        const pinFile = part(pin.partId);
        const pinColor = color(pin.color.id);
        const offsets = PIN_OFFSETS.slice(0, plate.pinsPerJoin);
        cards.forEach((_, i) => {
            const [c, r] = [i % columns, Math.floor(i / columns)];
            const [x, z] = [c * span, (rows - 1 - r) * span];
            if (c < columns - 1 && i + 1 < cards.length)
                for (const along of offsets)
                    lines.push(place(pinColor, x + span, PIN_DEPTH, z + span / 2 + along, pinFile));
            if (r < rows - 1 && i + columns < cards.length)
                for (const along of offsets)
                    lines.push(place(pinColor, x + span / 2 + along, PIN_DEPTH, z, pinFile, QUARTER_TURN));
        });
    }
    lines.push('0 NOFILE');
    for (const card of cards) {
        lines.push(...header(`Card ${card.id}`, cardFile(card.id)));
        // the backing plate, its corner at the card's corner
        lines.push(place(plateColor, span / 2, 0, span / 2, plateFile));
        card.rows.forEach((row, r) =>
            row.forEach((cell, c) => {
                if (!cell) return;
                const centre = (n: number) => (n * brick.size + brick.size / 2) * STUD;
                // rows from +z, as the cards are
                lines.push(place(color(cell.id), centre(c), -HEIGHT[brick.profile], span - centre(r), brickFile));
            }),
        );
        lines.push('0 NOFILE');
    }
    return `${lines.join('\r\n')}\r\n`;
};
