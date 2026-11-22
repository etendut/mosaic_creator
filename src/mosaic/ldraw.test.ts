import { cardFile, MAX_LDRAW_BRICKS, toLdraw } from './ldraw';
import type { MosaicCard, PaletteColor } from './types';

const white: PaletteColor = { id: 1, name: 'White', hex: '#FFFFFF', type: 'Solid' };
const black: PaletteColor = { id: 11, name: 'Black', hex: '#000000', type: 'Solid' };
const plate = { partId: '3958', size: 6, color: black, pinsPerJoin: 0 };
const pin = { partId: '2780', color: black };
const tile = { partId: '3070', size: 1, profile: 'tile' as const };

/** A card of `size` × `size` cells, white except where `cells` says, null meaning no brick. */
const card = (id: string, size: number, cells: Record<string, PaletteColor | null> = {}): MosaicCard => {
    const rows = Array.from({ length: size }, (_, r) =>
        Array.from({ length: size }, (_, c) => (`${c},${r}` in cells ? cells[`${c},${r}`] : white)),
    );
    return { id, rows, brickCount: rows.flat().filter(Boolean).length };
};
const lines = (model: string) => model.split('\r\n');
const files = (model: string) => lines(model).filter((l) => l.startsWith('0 FILE '));
/** The type 1 lines of one file in the model. */
const placed = (model: string, file: string) => {
    const all = lines(model);
    const start = all.indexOf(`0 FILE ${file}`);
    const end = all.indexOf('0 NOFILE', start);
    return all.slice(start, end).filter((l) => l.startsWith('1 '));
};

describe('toLdraw', () => {
    it('writes one model file with the mosaic, then a submodel per card', () => {
        const model = toLdraw({
            title: 'Balloon',
            cards: [card('A1', 6), card('A2', 6)],
            columns: 2,
            brick: tile,
            plate,
            pin,
        });
        expect(files(model)).toEqual(['0 FILE mosaic.ldr', '0 FILE card-a1.ldr', '0 FILE card-a2.ldr']);
        expect(lines(model).slice(0, 4)).toEqual([
            '0 FILE mosaic.ldr',
            '0 Balloon',
            '0 Name: mosaic.ldr',
            '0 Author: Mosaic Creator',
        ]);
        expect(model.endsWith('0 NOFILE\r\n')).toBe(true);
    });

    it('lays the cards out row by row, a plate apart (20 units a stud), the first row at +z so it reads top to bottom', () => {
        const cards = ['A1', 'A2', 'B1', 'B2'].map((id) => card(id, 6));
        const main = placed(toLdraw({ title: '', cards, columns: 2, brick: tile, plate, pin }), 'mosaic.ldr');
        expect(main).toEqual([
            '1 16 0 0 120 1 0 0 0 1 0 0 0 1 card-a1.ldr',
            '1 16 120 0 120 1 0 0 0 1 0 0 0 1 card-a2.ldr',
            '1 16 0 0 0 1 0 0 0 1 0 0 0 1 card-b1.ldr',
            '1 16 120 0 0 1 0 0 0 1 0 0 0 1 card-b2.ldr',
        ]);
    });

    it('puts each card on its backing plate, and each brick on a stud in its LDraw colour', () => {
        const model = toLdraw({
            title: '',
            cards: [card('A1', 6, { '1,0': black, '2,0': null })],
            columns: 1,
            brick: tile,
            plate,
            pin,
        });
        const a1 = placed(model, 'card-a1.ldr');
        // the plate's centre: its origin is the middle of its top face
        expect(a1[0]).toBe('1 0 60 0 60 1 0 0 0 1 0 0 0 1 3958.dat');
        // BrickLink White (1) is LDraw 15, Black (11) is 0; a tile's top is 8 above the plate; rows run from +z;
        // the empty cell has none
        expect(a1[1]).toBe('1 15 10 -8 110 1 0 0 0 1 0 0 0 1 3070b.dat');
        expect(a1[2]).toBe('1 0 30 -8 110 1 0 0 0 1 0 0 0 1 3070b.dat');
        expect(a1).toHaveLength(1 + 35);
        expect(a1.some((l) => l.includes(' 50 -8 110 '))).toBe(false);
    });

    it('stands taller bricks taller, and spaces 2 × 2 bricks two studs apart', () => {
        const brick = toLdraw({
            title: '',
            cards: [card('A1', 6)],
            columns: 1,
            brick: { partId: '3005', size: 1, profile: 'brick' },
            plate,
            pin,
        });
        expect(placed(brick, 'card-a1.ldr')[1]).toBe('1 15 10 -24 110 1 0 0 0 1 0 0 0 1 3005.dat');

        const big = toLdraw({
            title: '',
            cards: [card('A1', 3)],
            columns: 1,
            brick: { partId: '3003', size: 2, profile: 'brick' },
            plate,
            pin,
        });
        expect(placed(big, 'card-a1.ldr').slice(1, 3)).toEqual([
            '1 15 20 -24 100 1 0 0 0 1 0 0 0 1 3003.dat',
            '1 15 60 -24 100 1 0 0 0 1 0 0 0 1 3003.dat',
        ]);
    });

    it("refuses a mosaic too big for one model, and a colour or part it can't name", () => {
        // a 288 × 288 mosaic (82,944 bricks) is fine; past 120,000 it says why, and what to change
        const big = { ...card('A1', 1), brickCount: 82_944 };
        expect(() => toLdraw({ title: '', cards: [big], columns: 1, brick: tile, plate, pin })).not.toThrow();
        const huge = { ...card('A1', 1), brickCount: MAX_LDRAW_BRICKS + 1 };
        expect(() => toLdraw({ title: '', cards: [huge], columns: 1, brick: tile, plate, pin })).toThrow(
            /has 120,001 bricks, more than Studio can work with \(about 120,000\)\. Use fewer plates across/,
        );
        const odd: PaletteColor = { id: 99999, name: 'Odd', hex: '#123456', type: 'Solid' };
        expect(() =>
            toLdraw({ title: '', cards: [card('A1', 1, { '0,0': odd })], columns: 1, brick: tile, plate, pin }),
        ).toThrow('No LDraw colour for BrickLink colour 99999');
        expect(() =>
            toLdraw({ title: '', cards: [card('A1', 1)], columns: 1, brick: { ...tile, partId: 'nope' }, plate, pin }),
        ).toThrow('No LDraw part for BrickLink part nope');
    });

    it('joins pinned plates with pins along each shared edge, as built in Studio', () => {
        // the 16 × 16 Technic brick, 3 × 3 of them: as in a model built in Studio, 3 pins a join, 12 joins
        const technic = { partId: '65803', size: 16, color: black, pinsPerJoin: 3 };
        const cards = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map((id) => card(id, 1));
        const model = toLdraw({ title: '', cards, columns: 3, brick: tile, plate: technic, pin });
        const pins = placed(model, 'mosaic.ldr').filter((l) => l.endsWith(' 2780.dat'));
        expect(pins).toHaveLength(36);
        // A1 to A2: on their shared edge (x 320), 18 below the top, mid-edge and 5 studs either side, unrotated
        expect(pins.slice(0, 3)).toEqual([
            '1 0 320 18 700 1 0 0 0 1 0 0 0 1 2780.dat',
            '1 0 320 18 800 1 0 0 0 1 0 0 0 1 2780.dat',
            '1 0 320 18 900 1 0 0 0 1 0 0 0 1 2780.dat',
        ]);
        // A1 to B1, the row below (z 640): turned a quarter, across the edge
        expect(pins.slice(3, 6)).toEqual([
            '1 0 60 18 640 0 0 1 0 1 0 -1 0 0 2780.dat',
            '1 0 160 18 640 0 0 1 0 1 0 -1 0 0 2780.dat',
            '1 0 260 18 640 0 0 1 0 1 0 -1 0 0 2780.dat',
        ]);
        // the last card joins nothing further; plates without pins get none
        const plain = toLdraw({ title: '', cards, columns: 3, brick: tile, plate, pin });
        expect(plain).not.toContain('2780.dat');
    });

    it("names each card's submodel file after the card", () => {
        expect(cardFile('B12')).toBe('card-b12.ldr');
    });
});
