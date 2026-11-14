import { colorDistance, hexToRgb } from './color';
import type { Cell, PaletteColor, PixelGrid } from './types';

export type TouchUpMode = 'view' | 'paint' | 'erase';

export type BrushShape = 'round' | 'square';

/** Brush sizes on offer, in bricks across. */
export const BRUSH_SIZES = [1, 2, 3, 4, 5, 7, 9];

/** What a click or drag on the map does: paint bricks one colour, or remove them (`colorId: null`), with a brush. */
export interface BrickTool {
    colorId: number | null;
    size: number;
    shape: BrushShape;
}

/** Everything the touch-up toolbar sets: what a click on the map does, with which colour and brush, and before/after. */
export interface TouchUpState {
    mode: TouchUpMode;
    /** Null until chosen; the map then paints with the most used colour. */
    color: PaletteColor | null;
    size: number;
    shape: BrushShape;
    /** Show the mosaic as it was before touch-ups (and don't paint). */
    before: boolean;
}

export const DEFAULT_TOUCH_UP: TouchUpState = { mode: 'view', color: null, size: 1, shape: 'square', before: false };

/** The brush for the toolbar's state; null when the map only shows the mosaic. */
export const brushFor = ({ mode, color, size, shape, before }: TouchUpState): BrickTool | null => {
    if (before) return null;
    if (mode === 'erase') return { colorId: null, size, shape };
    if (mode === 'paint' && color) return { colorId: color.id, size, shape };
    return null;
};

/**
 * The bricks a brush covers when it's over brick (x, y), clipped to the grid. A square brush covers `size` × `size`
 * bricks; a round one drops the bricks outside a circle, so size 3 is a plus and size 5 a rounded square. For even
 * sizes, (x, y) is the brick up and left of the centre.
 */
export const brushCells = (
    x: number,
    y: number,
    { size, shape }: Pick<BrickTool, 'size' | 'shape'>,
    grid: Pick<PixelGrid, 'width' | 'height'>,
) => {
    const centre = (size - 1) / 2;
    const reach = (centre + 0.25) ** 2;
    const start = Math.floor(centre);
    const cells: { x: number; y: number }[] = [];
    for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
            if (shape === 'round' && (i - centre) ** 2 + (j - centre) ** 2 > reach) continue;
            const cx = x + i - start;
            const cy = y + j - start;
            if (cx >= 0 && cy >= 0 && cx < grid.width && cy < grid.height) cells.push({ x: cx, y: cy });
        }
    }
    return cells;
};

/** One touched-up brick: its column, row, and the colour id it becomes (`null` for no brick). */
export type Edit = [x: number, y: number, colorId: number | null];

/**
 * Bricks changed by hand on top of the matched grid. They belong to a grid of one size: at any other size (a change of
 * plates across, plate, brick or crop) they don't line up, so they're kept but not shown.
 */
export interface TouchUps {
    width: number;
    height: number;
    edits: Edit[];
}

export const fitsGrid = (touchUps: TouchUps | null, grid: Pick<PixelGrid, 'width' | 'height'>) =>
    !!touchUps && touchUps.width === grid.width && touchUps.height === grid.height;

/** Add `edits` to `touchUps` (later edits to the same brick win). Touch-ups for a different size are replaced. */
export const addEdits = (
    touchUps: TouchUps | null,
    grid: Pick<PixelGrid, 'width' | 'height'>,
    edits: Edit[],
): TouchUps => {
    const byCell = new Map<string, Edit>();
    for (const edit of [...(fitsGrid(touchUps, grid) ? touchUps!.edits : []), ...edits])
        byCell.set(`${edit[0]},${edit[1]}`, edit);
    return { width: grid.width, height: grid.height, edits: [...byCell.values()] };
};

/** The grid with the touch-ups applied. Edits to a colour the current brick doesn't come in are skipped. */
export const applyTouchUps = (grid: PixelGrid, touchUps: TouchUps | null, colors: PaletteColor[]): PixelGrid => {
    if (!fitsGrid(touchUps, grid) || touchUps!.edits.length === 0) return grid;
    const byId = new Map(colors.map((c) => [c.id, c]));
    const rows = grid.rows.map((row) => [...row]);
    for (const [x, y, id] of touchUps!.edits) {
        if (id === null) rows[y][x] = null;
        else if (byId.has(id)) rows[y][x] = byId.get(id)!;
    }
    return { ...grid, rows };
};

/**
 * How strict the clean-up is: `lone` changes bricks that match none of their neighbours; `pairs` also changes bricks
 * that match just one, which clears specks two bricks big.
 */
export type CleanUpStrength = 'lone' | 'pairs';

const NEIGHBOURS = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
];

/**
 * Edits that recolour stray bricks to the most common colour around them. A brick is stray when at most 0 (`lone`)
 * or 1 (`pairs`) of its 8 neighbours share its colour, and at least 5 neighbours are bricks, so the edge of the
 * mosaic and of empty areas is left alone. Bricks along an edge between two larger areas have 2 or more matching
 * neighbours, so they stay. Ties go to the colour closest to the brick's own. Every brick is judged on the grid as it
 * is, before any change.
 */
export const findStrays = (grid: PixelGrid, strength: CleanUpStrength): Edit[] => {
    const allowed = strength === 'lone' ? 0 : 1;
    const at = (x: number, y: number): Cell => grid.rows[y]?.[x] ?? null;
    const edits: Edit[] = [];
    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const cell = at(x, y);
            if (!cell) continue;
            const counts = new Map<number, { color: PaletteColor; n: number }>();
            let bricks = 0;
            let same = 0;
            for (const [dx, dy] of NEIGHBOURS) {
                const n = at(x + dx, y + dy);
                if (!n) continue;
                bricks++;
                if (n.id === cell.id) same++;
                else {
                    const count = counts.get(n.id);
                    if (count) count.n++;
                    else counts.set(n.id, { color: n, n: 1 });
                }
            }
            if (bricks < 5 || same > allowed || counts.size === 0) continue;
            const own = hexToRgb(cell.hex);
            const best = [...counts.values()].reduce((a, b) =>
                b.n > a.n ||
                (b.n === a.n && colorDistance(own, hexToRgb(b.color.hex)) < colorDistance(own, hexToRgb(a.color.hex)))
                    ? b
                    : a,
            );
            edits.push([x, y, best.color.id]);
        }
    }
    return edits;
};
