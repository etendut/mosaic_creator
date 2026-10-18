import { colorDistance, contrastTextColor, hexToRgb, nearestColor, rgbToHex } from './color';

describe('hexToRgb / rgbToHex', () => {
    it('round-trips 6 digit hex', () => {
        expect(hexToRgb('#AFB5C7')).toEqual({ r: 175, g: 181, b: 199 });
        expect(rgbToHex({ r: 175, g: 181, b: 199 })).toBe('#AFB5C7');
    });

    it('expands 3 digit hex and ignores alpha digits', () => {
        expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(hexToRgb('#00000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('pads low values', () => {
        expect(rgbToHex({ r: 0, g: 0, b: 1 })).toBe('#000001');
    });

    it('rejects junk', () => {
        expect(() => hexToRgb('red')).toThrow();
    });
});

describe('nearestColor', () => {
    const black = { id: 11, r: 33, g: 33, b: 33 };
    const white = { id: 1, r: 255, g: 255, b: 255 };
    const red = { id: 5, r: 180, g: 0, b: 0 };

    it('picks the closest palette entry', () => {
        expect(nearestColor({ r: 10, g: 10, b: 10 }, [white, black, red])).toBe(black);
        expect(nearestColor({ r: 240, g: 230, b: 250 }, [black, red, white])).toBe(white);
        expect(nearestColor({ r: 200, g: 40, b: 30 }, [black, white, red])).toBe(red);
    });

    // regression: the old distance parsed `a.a ?? 0 - b.a ?? 0` and added the source alpha squared to every candidate
    it('distance depends on RGB only', () => {
        expect(colorDistance({ r: 1, g: 2, b: 3 }, { r: 1, g: 2, b: 3 })).toBe(0);
        expect(colorDistance({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 0 })).toBe(25);
    });

    it('rgb metric is plain euclidean', () => {
        expect(colorDistance({ r: 0, g: 0, b: 0 }, { r: 3, g: 4, b: 0 }, 'rgb')).toBe(25);
    });

    it('perceptual metric weights green differences above red and blue', () => {
        const base = { r: 128, g: 128, b: 128 };
        const green = colorDistance(base, { ...base, g: 138 }, 'perceptual');
        expect(green).toBeGreaterThan(colorDistance(base, { ...base, r: 138 }, 'perceptual'));
        expect(green).toBeGreaterThan(colorDistance(base, { ...base, b: 138 }, 'perceptual'));
    });

    // a real disagreement from the Tile Round 1x1 solid palette
    it('can pick a different colour than rgb', () => {
        const vividGreen = { r: 102, g: 255, b: 34 };
        const lime = { id: 34, r: 166, g: 202, b: 85 };
        const brightGreen = { id: 36, r: 16, g: 203, b: 49 };
        expect(nearestColor(vividGreen, [lime, brightGreen], 'rgb')).toBe(lime);
        expect(nearestColor(vividGreen, [lime, brightGreen], 'perceptual')).toBe(brightGreen);
    });

    it('throws on empty palette', () => {
        expect(() => nearestColor({ r: 0, g: 0, b: 0 }, [])).toThrow();
    });
});

describe('contrastTextColor', () => {
    it('is white on dark and black on light', () => {
        expect(contrastTextColor('#212121')).toBe('white');
        expect(contrastTextColor('#FFFFFF')).toBe('black');
        expect(contrastTextColor(undefined)).toBe('black');
    });
});
