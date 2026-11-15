import FitScreenIcon from '@mui/icons-material/FitScreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { drawPreview } from '../mosaic/image';
import { brushCells, type BrickTool, type Edit } from '../mosaic/touchUp';
import type { Cell, PixelGrid } from '../mosaic/types';
import { FIT, MAX_ZOOM, panBy, zoomAt, type View } from '../mosaic/view';
import type { Mosaic } from '../useMosaic';

/** Target on-screen width of the preview; the canvas is scaled down with CSS if the window is narrower. */
const PREVIEW_WIDTH_PX = 1200;
const FILL_WIDTH_PX = 2400;
/** Each press of + or − zooms by this much. */
const ZOOM_STEP = 1.5;

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
    /**
     * Let the map zoom and pan: pinch and two-finger drag on touch screens; the wheel, and Space or middle-button
     * drags, with a mouse; and a zoom control in the corner.
     */
    zoomable?: boolean;
}

type Point = { x: number; y: number };

const MosaicPreview = ({
    mosaic,
    tool = null,
    showGrid,
    onPick = null,
    fill = false,
    zoomable = false,
}: MosaicPreviewProps) => {
    const { brick, plate, cellsPerSide, editBricks } = mosaic;
    const grid = showGrid ?? mosaic.grid;
    // the map takes clicks when painting, erasing or picking a colour
    const active = !!tool || !!onPick;
    const frameRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hover, setHover] = useState<Point | null>(null);
    const [view, setView] = useState<View>(FIT);
    const [spaceHeld, setSpaceHeld] = useState(false);
    // during a drag: the last brick the pointer was over, and whether this drag has changed anything yet (its first
    // change starts a new undo step, the rest join it)
    const stroke = useRef<{ last: string; started: boolean } | null>(null);
    // the pointers on the map, for pinching; a finger's brick waits until it moves or lifts, in case a second finger
    // turns it into a pinch; and the view and positions a pan or pinch started from
    const pointers = useRef(new Map<number, Point>());
    const pending = useRef<{ id: number; cell: Point } | null>(null);
    const gesture = useRef<{ kind: 'pan' | 'pinch'; view: View; start: Point; distance: number } | null>(null);

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

    /** The frame's size and where a client point falls in it. */
    const frame = () => frameRef.current!.getBoundingClientRect();
    const inFrame = (clientX: number, clientY: number) => {
        const r = frame();
        return { x: clientX - r.left, y: clientY - r.top };
    };
    const zoomBy = (factor: number, at?: Point) => {
        const r = frame();
        const p = at ?? { x: r.width / 2, y: r.height / 2 };
        setView((v) => zoomAt(v, factor, p.x, p.y, r.width, r.height));
    };

    // the wheel zooms around the pointer; listened to directly, as React's wheel listener can't stop the page scrolling
    useEffect(() => {
        const el = frameRef.current;
        if (!zoomable || !el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const r = el.getBoundingClientRect();
            const factor = Math.exp(-e.deltaY * 0.0015);
            setView((v) => zoomAt(v, factor, e.clientX - r.left, e.clientY - r.top, r.width, r.height));
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [zoomable]);

    // hold Space to pan with the mouse, as in a photo editor (not while typing)
    useEffect(() => {
        if (!zoomable) return;
        const typing = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.closest?.('input, textarea') != null;
        const down = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || typing(e)) return;
            e.preventDefault();
            setSpaceHeld(true);
        };
        const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceHeld(false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [zoomable]);

    /** The brick under the pointer, from where it sits on the canvas as drawn (zoomed or scaled by CSS). */
    const cellAt = (e: { clientX: number; clientY: number }) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        if (!grid || rect.width === 0 || rect.height === 0) return null;
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * grid.width);
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * grid.height);
        return x >= 0 && y >= 0 && x < grid.width && y < grid.height ? { x, y } : null;
    };

    const paint = (at: Point) => {
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

    /** A press on a brick: pick its colour, or start painting there. */
    const press = (cell: Point) => {
        if (onPick) return onPick(grid!.rows[cell.y][cell.x]);
        stroke.current = { last: '', started: false };
        paint(cell);
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (!zoomable && !active) return;
        const at = inFrame(e.clientX, e.clientY);
        pointers.current.set(e.pointerId, at);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        if (zoomable && pointers.current.size === 2) {
            // a second finger: pinch and pan, and the first finger's brick is never painted
            pending.current = null;
            stroke.current = null;
            const [a, b] = [...pointers.current.values()];
            gesture.current = {
                kind: 'pinch',
                view,
                start: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
            };
            return;
        }
        if (zoomable && e.pointerType === 'mouse' && (e.button === 1 || spaceHeld)) {
            e.preventDefault();
            gesture.current = { kind: 'pan', view, start: at, distance: 0 };
            return;
        }
        const cell = active && cellAt(e);
        if (!cell) return;
        e.preventDefault();
        // a finger waits to see if it's the start of a pinch; a mouse or pen acts at once
        if (zoomable && e.pointerType === 'touch') pending.current = { id: e.pointerId, cell };
        else press(cell);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const at = inFrame(e.clientX, e.clientY);
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, at);
        const g = gesture.current;
        if (g) {
            const r = frame();
            if (g.kind === 'pan') setView(panBy(g.view, at.x - g.start.x, at.y - g.start.y, r.width, r.height));
            else if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const zoomed = zoomAt(
                    g.view,
                    Math.hypot(a.x - b.x, a.y - b.y) / g.distance,
                    g.start.x,
                    g.start.y,
                    r.width,
                    r.height,
                );
                setView(panBy(zoomed, mid.x - g.start.x, mid.y - g.start.y, r.width, r.height));
            }
            return;
        }
        if (!active) return;
        const cell = cellAt(e);
        setHover(e.pointerType === 'mouse' && !spaceHeld ? cell : null);
        // a finger that moves is painting, starting from where it went down
        if (pending.current?.id === e.pointerId) {
            const start = pending.current.cell;
            pending.current = null;
            press(start);
        }
        if (cell && stroke.current) paint(cell);
    };

    const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
        // a finger lifted without moving or pinching: a tap on that brick
        if (pending.current?.id === e.pointerId && e.type === 'pointerup') press(pending.current.cell);
        pending.current = null;
        pointers.current.delete(e.pointerId);
        if (pointers.current.size === 0) gesture.current = null;
        stroke.current = null;
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
    const panning = spaceHeld;

    return (
        <Box
            ref={frameRef}
            data-testid="map-frame"
            data-zoom={view.zoom}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onPointerLeave={() => setHover(null)}
            sx={{
                position: 'relative',
                maxWidth: '100%',
                overflow: zoomable ? 'hidden' : 'visible',
                // a finger drag paints, pinches or pans the map instead of scrolling the page
                touchAction: active || zoomable ? 'none' : 'auto',
                cursor: panning ? 'grab' : active ? 'crosshair' : 'default',
            }}
        >
            <Box
                sx={{
                    transformOrigin: '0 0',
                    transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
                }}
            >
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
                    sx={{
                        display: 'block',
                        maxWidth: '100%',
                        // under the header, status line and tools, so the whole map is in view without scrolling
                        maxHeight: fill ? { md: 'calc(100dvh - 280px)' } : 'none',
                        height: 'auto',
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
                            outline: `${2 / view.zoom}px solid white`,
                            boxShadow: `0 0 0 ${3 / view.zoom}px rgba(0, 0, 0, 0.6)`,
                            pointerEvents: 'none',
                        }}
                    />
                )}
            </Box>
            {zoomable && (
                <Paper
                    elevation={2}
                    // the control takes its own clicks, so they don't paint the map underneath
                    onPointerDown={(e) => e.stopPropagation()}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        bottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 2,
                        cursor: 'default',
                    }}
                >
                    <Tooltip title="Zoom out">
                        <span>
                            <IconButton
                                aria-label="Zoom out"
                                onClick={() => zoomBy(1 / ZOOM_STEP)}
                                disabled={view.zoom <= 1}
                                sx={{ width: 40, height: 40 }}
                            >
                                <ZoomOutIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Typography variant="body2" aria-label="Zoom level" sx={{ minWidth: 44, textAlign: 'center' }}>
                        {Math.round(view.zoom * 100)}%
                    </Typography>
                    <Tooltip title="Zoom in">
                        <span>
                            <IconButton
                                aria-label="Zoom in"
                                onClick={() => zoomBy(ZOOM_STEP)}
                                disabled={view.zoom >= MAX_ZOOM}
                                sx={{ width: 40, height: 40 }}
                            >
                                <ZoomInIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Fit to screen">
                        <span>
                            <IconButton
                                aria-label="Fit to screen"
                                onClick={() => setView(FIT)}
                                disabled={view.zoom === 1}
                                sx={{ width: 40, height: 40 }}
                            >
                                <FitScreenIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Paper>
            )}
        </Box>
    );
};

export default MosaicPreview;
