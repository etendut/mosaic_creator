import { Box } from '@mui/material';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { drawPreview } from '../mosaic/image';
import { brushCells, type BrickTool, type Edit } from '../mosaic/touchUp';
import type { Cell, PixelGrid } from '../mosaic/types';
import type { Mosaic } from '../useMosaic';

/** Target on-screen width of the preview; the canvas is scaled down with CSS if the window is narrower. */
const PREVIEW_WIDTH_PX = 1200;
const FILL_WIDTH_PX = 2400;

interface MosaicPreviewProps {
    mosaic: Mosaic;
    /** Set to paint on the map; without it the map only shows the mosaic. */
    tool?: BrickTool | null;
    /** Draw this grid instead of the mosaic's, e.g. the one before touch-ups. */
    showGrid?: PixelGrid | null;
    /** Set to pick a brick's colour with a click (an eyedropper); called with the brick, or null for no brick. */
    onPick?: ((cell: Cell) => void) | null;
    /** Draw the map as big as the space allows, up to the window's height (for touching up bricks). */
    fill?: boolean;
}

const MosaicPreview = ({ mosaic, tool = null, showGrid, onPick = null, fill = false }: MosaicPreviewProps) => {
    const { brick, plate, cellsPerSide, editBricks } = mosaic;
    const grid = showGrid ?? mosaic.grid;
    // the map takes clicks when painting, erasing or picking a colour
    const active = !!tool || !!onPick;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
    // during a drag: the last brick the pointer was over, and whether this drag has changed anything yet (its first
    // change starts a new undo step, the rest join it)
    const stroke = useRef<{ last: string; started: boolean } | null>(null);

    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        drawPreview(canvasRef.current, grid, {
            // drawn sharp at the largest size it's shown at; CSS scales it down to fit
            cellPx: fill
                ? Math.max(4, Math.min(48, Math.floor(FILL_WIDTH_PX / grid.width)))
                : Math.max(4, Math.min(24, Math.floor(PREVIEW_WIDTH_PX / grid.width))),
            isRound: brick.isRound,
            background: plate.color.hex,
            cellsPerCard: cellsPerSide,
        });
    }, [grid, brick.isRound, plate.color.hex, cellsPerSide, fill]);

    /** The brick under the pointer, from where it sits on the canvas as drawn (CSS may have scaled it). */
    const cellAt = (e: PointerEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        if (!grid || rect.width === 0 || rect.height === 0) return null;
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * grid.width);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * grid.height);
        return x >= 0 && y >= 0 && x < grid.width && y < grid.height ? { x, y } : null;
    };

    const paint = (at: { x: number; y: number }) => {
        if (!tool || !grid || !stroke.current) return;
        const key = `${at.x},${at.y}`;
        if (stroke.current.last === key) return;
        stroke.current.last = key;
        const edits = brushCells(at.x, at.y, tool, grid)
            .filter(({ x, y }) => (grid.rows[y][x]?.id ?? null) !== tool.colorId)
            .map(({ x, y }): Edit => [x, y, tool.colorId]);
        if (edits.length === 0) return;
        editBricks(edits, { newStep: !stroke.current.started });
        stroke.current.started = true;
    };

    // the outline of the brush, round or square, around the bricks it covers; one brick for the eyedropper
    const outline =
        active && hover && grid ? brushCells(hover.x, hover.y, { size: tool?.size ?? 1, shape: 'square' }, grid) : null;
    const box = outline?.length && {
        left: Math.min(...outline.map((c) => c.x)),
        top: Math.min(...outline.map((c) => c.y)),
        right: Math.max(...outline.map((c) => c.x)) + 1,
        bottom: Math.max(...outline.map((c) => c.y)) + 1,
    };

    return (
        <Box sx={{ position: 'relative', maxWidth: '100%' }}>
            <Box
                component="canvas"
                ref={canvasRef}
                data-columns={grid?.width}
                data-rows={grid?.height}
                aria-label={
                    onPick
                        ? 'Card map: click a brick to pick its colour'
                        : tool
                          ? 'Card map: click or drag to change bricks'
                          : 'Card map'
                }
                onPointerDown={(e: PointerEvent<HTMLCanvasElement>) => {
                    const cell = active && cellAt(e);
                    if (!cell) return;
                    e.preventDefault();
                    if (onPick) {
                        onPick(grid!.rows[cell.y][cell.x]);
                        return;
                    }
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    stroke.current = { last: '', started: false };
                    paint(cell);
                }}
                onPointerMove={(e: PointerEvent) => {
                    if (!active) return;
                    const cell = cellAt(e);
                    setHover(e.pointerType === 'mouse' ? cell : null);
                    if (cell && stroke.current) paint(cell);
                }}
                onPointerUp={() => (stroke.current = null)}
                onPointerCancel={() => (stroke.current = null)}
                onPointerLeave={() => setHover(null)}
                sx={{
                    display: 'block',
                    maxWidth: '100%',
                    // under the header, step title and toolbar, so the whole map is in view without scrolling
                    maxHeight: fill ? { md: 'calc(100dvh - 280px)' } : 'none',
                    height: 'auto',
                    // while painting, a finger drag paints instead of scrolling the page
                    touchAction: active ? 'none' : 'auto',
                    cursor: active ? 'crosshair' : 'default',
                }}
            />
            {box && grid && (
                <Box
                    data-testid="brush-outline"
                    sx={{
                        position: 'absolute',
                        left: `${(box.left / grid.width) * 100}%`,
                        top: `${(box.top / grid.height) * 100}%`,
                        width: `${((box.right - box.left) / grid.width) * 100}%`,
                        height: `${((box.bottom - box.top) / grid.height) * 100}%`,
                        borderRadius: tool?.shape === 'round' && tool.size > 2 ? '50%' : 0,
                        outline: '2px solid white',
                        boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.6)',
                        pointerEvents: 'none',
                    }}
                />
            )}
        </Box>
    );
};

export default MosaicPreview;
