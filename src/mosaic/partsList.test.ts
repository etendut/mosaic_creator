import { toBrickLinkXml } from './bricklinkXml';
import { compileMosaicCards } from './cards';
import { buildPartsList, sparesFor, withSpares } from './partsList';
import type { BrickOption, PinOption, PlateOption } from './types';

const B = { id: 11, name: 'Black', hex: '#212121', type: 'Solid' as const };
const W = { id: 1, name: 'White', hex: '#FFFFFF', type: 'Solid' as const };
const brick: BrickOption = {
    partId: '98138',
    name: 'Tile, Round 1 x 1',
    size: 1,
    isRound: true,
    profile: 'tile',
    colors: [B, W],
};
const plate: PlateOption = {
    id: '1',
    partId: '41539',
    name: 'Plate 8 x 8',
    size: 2,
    profile: 'plate',
    color: B,
    pinsPerPlate: 0,
};
const pin: PinOption = { partId: '2780', name: 'Pin', color: B };

const cards = compileMosaicCards(
    {
        width: 4,
        height: 2,
        rows: [
            [W, W, B, null],
            [W, B, W, W],
        ],
    },
    2,
);

describe('buildPartsList', () => {
    it('counts exact bricks per colour, most first, then one plate per card', () => {
        expect(buildPartsList(cards, brick, plate, pin).map((l) => [l.partId, l.color.name, l.quantity])).toEqual([
            ['98138', 'White', 5],
            ['98138', 'Black', 2],
            ['41539', 'Black', 2],
        ]);
    });

    it('adds pins for plates that need them', () => {
        const lines = buildPartsList(cards, brick, { ...plate, pinsPerPlate: 4 }, pin);
        expect(lines.at(-1)).toMatchObject({ partId: '2780', quantity: 8 });
    });

    it('is empty with no cards', () => {
        expect(buildPartsList([], brick, plate, pin)).toEqual([]);
    });
});

describe('spares', () => {
    it('rounds up, so every line gets at least one', () => {
        expect(sparesFor(30, 10)).toBe(3);
        expect(sparesFor(31, 10)).toBe(4);
        expect(sparesFor(2, 5)).toBe(1);
        expect(sparesFor(200, 0)).toBe(0);
    });

    it('adds at least the percentage to every brick and pin line, but not the plates', () => {
        const exact = buildPartsList(cards, brick, { ...plate, pinsPerPlate: 4 }, pin);
        const order = withSpares(exact, 10, plate.partId);
        order.forEach((line, i) => {
            if (line.partId === plate.partId) expect(line).toMatchObject({ quantity: exact[i].quantity, spares: 0 });
            else expect(line.quantity).toBeGreaterThanOrEqual(Math.ceil(exact[i].quantity * 1.1));
            expect(line.quantity).toBe(exact[i].quantity + line.spares!);
        });
        expect(order.map((l) => l.spares)).toEqual([1, 1, 0, 1]);
    });

    it('changes nothing at 0%', () => {
        const exact = buildPartsList(cards, brick, plate, pin);
        expect(withSpares(exact, 0, plate.partId).map((l) => l.quantity)).toEqual(exact.map((l) => l.quantity));
    });
});

describe('toBrickLinkXml', () => {
    it('writes a wanted list', () => {
        const xml = toBrickLinkXml([{ partId: '3068b', name: 'Tile', color: B, quantity: 12 }]);
        expect(xml).toBe(
            '<INVENTORY>\n' +
                '  <ITEM>\n' +
                '    <ITEMTYPE>P</ITEMTYPE>\n' +
                '    <ITEMID>3068b</ITEMID>\n' +
                '    <COLOR>11</COLOR>\n' +
                '    <MINQTY>12</MINQTY>\n' +
                '  </ITEM>\n' +
                '</INVENTORY>\n',
        );
    });

    it('escapes part ids', () => {
        expect(toBrickLinkXml([{ partId: 'a<b', name: '', color: B, quantity: 1 }])).toContain(
            '<ITEMID>a&lt;b</ITEMID>',
        );
    });
});
