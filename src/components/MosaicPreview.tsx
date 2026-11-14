import { Box } from '@mui/material';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { drawPreview } from '../mosaic/image';
import type { BrickTool, Edit } from '../mosaic/touchUp';
import type { Mosaic } from '../useMosaic';

/** Target on-screen width of the preview; the canvas is scaled down with CSS if the window is narrower. */
const PREVIEW_WIDTH_PX = 1200;

interface MosaicPreviewProps {
    mosaic: Mosaic;
    /** Set to paint on the map; without it the map only shows the mosaic. */
    tool?: BrickTool | null;
}

const MosaicPreview = ({ mosaic, tool = null }: MosaicPreviewProps) => {
    const { grid, brick, plate, cellsPerSide, editBricks } = mosaic;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
    // during a drag: the last brick painted, and whether this drag has changed anything yet (its first change starts
    // a new undo step, the rest join it)
    const stroke = useRef<{ last: string; started: boolean } | null>(null);

    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        drawPreview(canvasRef.current, grid, {
            cellPx: Math.max(4, Math.min(24, Math.floor(PREVIEW_WIDTH_PX / grid.width))),
            isRound: brick.isRound,
            background: plate.color.hex,
            cellsPerCard: cellsPerSide,
        });
    }, [grid, brick.isRound, plate.color.hex, cellsPerSide]);

    /** The brick under the pointer, from where it sits on the canvas as drawn (CSS may have scaled it). */
    const cellAt = (e: PointerEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        if (!grid || rect.width === 0 || rect.height === 0) return null;
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * grid.width);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * grid.height);
        return x >= 0 && y >= 0 && x < grid.width && y < grid.height ? { x, y } : null;
    };

    const paint = (cell: { x: number; y: number }) => {
        if (!tool || !grid || !stroke.current) return;
        const key = `${cell.x},${cell.y}`;
        if (stroke.current.last === key) return;
        stroke.current.last = key;
        if ((grid.rows[cell.y][cell.x]?.id ?? null) === tool.colorId) return;
        const edit: Edit = [cell.x, cell.y, tool.colorId];
        editBricks([edit], { newStep: !stroke.current.started });
        stroke.current.started = true;
    };

    return (
        <Box sx={{ position: 'relative', maxWidth: '100%' }}>
            <Box
                component="canvas"
                ref={canvasRef}
                aria-label={tool ? 'Card map: click or drag to change bricks' : 'Card map'}
                onPointerDown={(e: PointerEvent<HTMLCanvasElement>) => {
                    const cell = tool && cellAt(e);
                    if (!cell) return;
                    e.preventDefault();
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                    stroke.current = { last: '', started: false };
                    paint(cell);
                }}
                onPointerMove={(e: PointerEvent) => {
                    if (!tool) return;
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
                    height: 'auto',
                    // while painting, a finger drag paints instead of scrolling the page
                    touchAction: tool ? 'none' : 'auto',
                    cursor: tool ? 'crosshair' : 'default',
                }}
            />
            {tool && hover && grid && (
                <Box
                    data-testid="brick-outline"
                    sx={{
                        position: 'absolute',
                        left: `${(hover.x / grid.width) * 100}%`,
                        top: `${(hover.y / grid.height) * 100}%`,
                        width: `${100 / grid.width}%`,
                        height: `${100 / grid.height}%`,
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
