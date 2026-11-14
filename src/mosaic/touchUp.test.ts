import { addEdits, applyTouchUps, findStrays, fitsGrid, toolFor, type Edit } from './touchUp';
import type { Cell, PaletteColor, PixelGrid } from './types';

const color = (id: number, hex: string): PaletteColor => ({ id, name: `c${id}`, hex, type: 'Solid' });
const A = color(1, '#FFFFFF');
const B = color(11, '#212121');
const C = color(85, '#6C6E68');
const D = color(5, '#F00000');
const byLetter: Record<string, Cell> = { A, B, C, D, '.': null };

/** A grid from rows of letters, e.g. ['AAB', 'A.B']; `.` is no brick. */
const grid = (...rows: string[]): PixelGrid => ({
    width: rows[0].length,
    height: rows.length,
    rows: rows.map((r) => [...r].map((ch) => byLetter[ch])),
});
const letters = (g: PixelGrid) =>
    g.rows.map((r) => r.map((c) => Object.keys(byLetter).find((k) => byLetter[k] === c)).join(''));
const fix = (g: PixelGrid, edits: Edit[]) => letters(applyTouchUps(g, addEdits(null, g, edits), [A, B, C, D]));

describe('touch-ups', () => {
    it('apply on top of the grid, including removing bricks', () => {
        const g = grid('AAA', 'AAA');
        expect(
            fix(g, [
                [0, 0, 11],
                [2, 1, null],
            ]),
        ).toEqual(['BAA', 'AA.']);
        expect(letters(g)).toEqual(['AAA', 'AAA']);
    });

    it('keep the last edit to each brick', () => {
        const g = grid('AA');
        const touchUps = addEdits(addEdits(null, g, [[0, 0, 11]]), g, [
            [0, 0, 85],
            [1, 0, 11],
        ]);
        expect(touchUps.edits).toEqual([
            [0, 0, 85],
            [1, 0, 11],
        ]);
    });

    it('only apply to a grid of the size they were made on, and start again at a new size', () => {
        const touchUps = addEdits(null, grid('AA'), [[0, 0, 11]]);
        expect(fitsGrid(touchUps, grid('AA'))).toBe(true);
        expect(fitsGrid(touchUps, grid('AAA'))).toBe(false);
        expect(fitsGrid(null, grid('AA'))).toBe(false);
        expect(letters(applyTouchUps(grid('AAA'), touchUps, [A, B]))).toEqual(['AAA']);
        expect(addEdits(touchUps, grid('AAA'), [[2, 0, 11]]).edits).toEqual([[2, 0, 11]]);
    });

    it('skip colours the current brick does not come in', () => {
        const g = grid('AA');
        expect(
            letters(
                applyTouchUps(
                    g,
                    addEdits(null, g, [
                        [0, 0, 11],
                        [1, 0, 999],
                    ]),
                    [A, B],
                ),
            ),
        ).toEqual(['BA']);
    });
});

describe('findStrays', () => {
    it('recolours a lone brick to the colour around it', () => {
        const g = grid('AAAA', 'ABAA', 'AAAA', 'AAAA');
        expect(findStrays(g, 'lone')).toEqual([[1, 1, 1]]);
    });

    it('leaves edges between larger areas, and the mosaic edge, alone', () => {
        const halves = grid('AABB', 'AABB', 'AABB', 'AABB');
        const diagonal = grid('AAAB', 'AABB', 'ABBB', 'BBBB');
        for (const g of [halves, diagonal]) {
            expect(findStrays(g, 'lone')).toEqual([]);
            expect(findStrays(g, 'pairs')).toEqual([]);
        }
        // a brick on the edge of the mosaic or of an empty area has too few neighbours to judge
        expect(findStrays(grid('BAA', 'AAA', 'AAA'), 'lone')).toEqual([]);
        expect(findStrays(grid('...', '.B.', 'AAA'), 'lone')).toEqual([]);
    });

    it('clears pairs only when asked', () => {
        const g = grid('AAAAA', 'ABBAA', 'AAAAA', 'AAAAA');
        expect(findStrays(g, 'lone')).toEqual([]);
        expect(findStrays(g, 'pairs')).toEqual([
            [1, 1, 1],
            [2, 1, 1],
        ]);
    });

    it('takes the most common neighbour colour, breaking ties by the closest to the brick', () => {
        // the grey brick has 4 white and 4 black neighbours; this grey is closer to black
        const tie = grid('ABA', 'BCB', 'ABA');
        expect(findStrays(tie, 'lone')).toEqual([[1, 1, 11]]);
        expect(findStrays(grid('DDA', 'DCA', 'DDA'), 'lone')).toEqual([[1, 1, 5]]);
    });
});

describe('toolFor', () => {
    it('paints with the colour, erases with no brick, and does nothing when viewing', () => {
        expect(toolFor('paint', B)).toEqual({ colorId: 11 });
        expect(toolFor('paint', null)).toBeNull();
        expect(toolFor('erase', B)).toEqual({ colorId: null });
        expect(toolFor('view', B)).toBeNull();
    });
});
