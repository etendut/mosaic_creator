import FitScreenIcon from '@mui/icons-material/FitScreen';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { drawPreview } from '../mosaic/image';
import { brushCells, type BrickTool, type Edit } from '../mosaic/touchUp';
import type { Cell, PixelGrid } from '../mosaic/types';
import { clampZoom, contentAt, drawZoom, fitScale, MAX_ZOOM, scrollForZoom, scrollToPut } from '../mosaic/view';
import type { Mosaic } from '../useMosaic';

/** Target on-screen width of the preview; the canvas is scaled down with CSS if the window is narrower. */
const PREVIEW_WIDTH_PX = 1200;
/** Each press of + or − zooms by this much. */
const ZOOM_STEP = 1.5;
/** The biggest the zoomable map's canvas is drawn, so a big mosaic at 8× doesn't need a huge canvas. */
const MAX_CANVAS_PX = 4096;

interface MosaicPreviewProps {
    mosaic: Mosaic;
    /** Set to paint on the map; without it the map only shows the mosaic. */
    tool?: BrickTool | null;
    /** Draw this grid instead of the mosaic's, e.g. the one before touch-ups. */
    showGrid?: PixelGrid | null;
    /** Set to pick a brick's colour with a click (an eyedropper); called with the brick, or null for no brick. */
    onPick?: ((cell: Cell) => void) | null;
    /**
     * Fill the space with the map in a scrolling box that zooms: Ctrl + wheel or a trackpad pinch, pinch on touch
     * screens, and a zoom control in the corner. Zoomed in, it scrolls: scroll bars, the wheel, two fingers, or
     * Space or middle-button drags.
     */
    zoomable?: boolean;
}

type Point = { x: number; y: number };

/** One button of the zoom control, with a tooltip that still shows when it's disabled. */
const ZoomButton = (props: { title: string; icon: ReactNode; onClick: () => void; disabled: boolean }) => (
    <Tooltip title={props.title}>
        <span>
            <IconButton
                aria-label={props.title}
                onClick={props.onClick}
                disabled={props.disabled}
                sx={{ width: 40, height: 40 }}
            >
                {props.icon}
            </IconButton>
        </span>
    </Tooltip>
);

const MosaicPreview = ({ mosaic, tool = null, showGrid, onPick = null, zoomable = false }: MosaicPreviewProps) => {
    const { brick, plate, cellsPerSide, editBricks } = mosaic;
    const grid = showGrid ?? mosaic.grid;
    // the map takes clicks when painting, erasing or picking a colour
    const active = !!tool || !!onPick;
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hover, setHover] = useState<Point | null>(null);
    const [zoom, setZoom] = useState(1);
    const [box, setBox] = useState({ width: 0, height: 0 });
    // where the box starts on the page, so it can fill exactly from there to the bottom of the window
    const [top, setTop] = useState(0);
    const [spaceHeld, setSpaceHeld] = useState(false);
    // during a drag: the last brick the pointer was over, and whether this drag has changed anything yet (its first
    // change starts a new undo step, the rest join it)
    const stroke = useRef<{ last: string; started: boolean } | null>(null);
    // the pointers on the map, for pinching; a finger's brick waits until it moves or lifts, in case a second finger
    // turns it into a pinch; what a pan or pinch started from; and the scroll to apply once a new zoom is laid out
    const pointers = useRef(new Map<number, Point>());
    const pending = useRef<{ id: number; cell: Point } | null>(null);
    const gesture = useRef<{
        kind: 'pan' | 'pinch';
        start: Point;
        scroll: Point;
        zoom: number;
        distance: number;
        content: Point;
    } | null>(null);
    const nextScroll = useRef<Point | null>(null);
    const zoomRef = useRef(1);

    // the map's size at zoom 1: as big as fits the box, keeping its shape
    const scale = grid ? fitScale(grid.width, grid.height, box.width, box.height) : 0;
    const base = { width: (grid?.width ?? 0) * scale, height: (grid?.height ?? 0) * scale };

    // drawn sharp for the size it's shown at; zoomable maps redraw at 2×, 4× and 8×
    let cellPx = 4;
    if (grid && (!zoomable || scale === 0))
        cellPx = Math.max(4, Math.min(24, Math.floor(PREVIEW_WIDTH_PX / grid.width)));
    else if (grid) {
        const wanted = Math.round(scale * drawZoom(zoom) * (window.devicePixelRatio || 1));
        cellPx = Math.max(4, Math.min(wanted, Math.floor(MAX_CANVAS_PX / Math.max(grid.width, grid.height))));
    }

    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        drawPreview(canvasRef.current, grid, {
            cellPx,
            isRound: brick.isRound,
            background: plate.color.hex,
            cellsPerCard: cellsPerSide,
        });
    }, [grid, brick.isRound, plate.color.hex, cellsPerSide, cellPx]);

    // the box's size, for fitting the map to it, and where it starts on the page; again whenever the window or the
    // page's layout changes (a status line that wraps, say)
    const measure = useCallback((el: HTMLDivElement | null) => {
        scrollRef.current = el;
        if (!el) return;
        const update = () => {
            setBox({ width: el.offsetWidth, height: el.offsetHeight });
            setTop(Math.round(el.getBoundingClientRect().top + window.scrollY));
        };
        update();
        window.addEventListener('resize', update);
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
        observer?.observe(el);
        observer?.observe(document.body);
        return () => {
            window.removeEventListener('resize', update);
            observer?.disconnect();
        };
    }, []);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);
    // once a new zoom is laid out, scroll so the point it zoomed around stays put
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el || !nextScroll.current) return;
        el.scrollLeft = nextScroll.current.x;
        el.scrollTop = nextScroll.current.y;
        nextScroll.current = null;
    }, [zoom]);

    /** Zoom to `to`, scrolled to `scroll`; or just scroll, if the zoom isn't changing. */
    const applyZoom = useCallback((to: number, scroll: Point) => {
        const el = scrollRef.current;
        if (!el) return;
        if (to === zoomRef.current) {
            el.scrollLeft = scroll.x;
            el.scrollTop = scroll.y;
        } else {
            nextScroll.current = scroll;
            zoomRef.current = to;
            setZoom(to);
        }
    }, []);

    /** Zoom by `factor` around a point of the box (its centre by default). */
    const zoomAround = useCallback(
        (factor: number, at?: Point) => {
            const el = scrollRef.current;
            if (!el) return;
            const from = zoomRef.current;
            const to = clampZoom(from * factor);
            const p = at ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 };
            applyZoom(to, {
                x: scrollForZoom(from, to, p.x, el.scrollLeft, base.width, el.clientWidth),
                y: scrollForZoom(from, to, p.y, el.scrollTop, base.height, el.clientHeight),
            });
        },
        [applyZoom, base.width, base.height],
    );

    // Ctrl + wheel (and a trackpad pinch, which arrives as one) zooms around the pointer; a plain wheel scrolls.
    // Listened to directly, as React's wheel listener can't stop the page zooming.
    useEffect(() => {
        const el = scrollRef.current;
        if (!zoomable || !el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const r = el.getBoundingClientRect();
            zoomAround(Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [zoomable, zoomAround]);

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

    /** The brick under the pointer, from where it sits on the canvas as drawn. */
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
        const r = e.currentTarget.getBoundingClientRect();
        const at = { x: e.clientX - r.left, y: e.clientY - r.top };
        pointers.current.set(e.pointerId, at);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const el = scrollRef.current;
        if (zoomable && el && pointers.current.size === 2) {
            // a second finger: pinch and pan, and the first finger's brick is never painted
            pending.current = null;
            stroke.current = null;
            const [a, b] = [...pointers.current.values()];
            const start = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            gesture.current = {
                kind: 'pinch',
                start,
                scroll: { x: el.scrollLeft, y: el.scrollTop },
                zoom: zoomRef.current,
                distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
                content: {
                    x: contentAt(zoomRef.current, start.x, el.scrollLeft, base.width, el.clientWidth),
                    y: contentAt(zoomRef.current, start.y, el.scrollTop, base.height, el.clientHeight),
                },
            };
            return;
        }
        if (zoomable && el && e.pointerType === 'mouse' && (e.button === 1 || spaceHeld)) {
            e.preventDefault();
            const scroll = { x: el.scrollLeft, y: el.scrollTop };
            gesture.current = { kind: 'pan', start: at, scroll, zoom: zoomRef.current, distance: 0, content: at };
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
        const r = e.currentTarget.getBoundingClientRect();
        const at = { x: e.clientX - r.left, y: e.clientY - r.top };
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, at);
        const g = gesture.current;
        const el = scrollRef.current;
        if (g && el) {
            if (g.kind === 'pan') {
                el.scrollLeft = g.scroll.x - (at.x - g.start.x);
                el.scrollTop = g.scroll.y - (at.y - g.start.y);
            } else if (pointers.current.size === 2) {
                // zoom by how far the fingers spread, keeping the content that was between them between them
                const [a, b] = [...pointers.current.values()];
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const to = clampZoom((g.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.distance);
                applyZoom(to, {
                    x: scrollToPut(g.content.x, to, mid.x, base.width, el.clientWidth),
                    y: scrollToPut(g.content.y, to, mid.y, base.height, el.clientHeight),
                });
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
    const brushBox = outline?.length && {
        left: Math.min(...outline.map((c) => c.x)),
        top: Math.min(...outline.map((c) => c.y)),
        right: Math.max(...outline.map((c) => c.x)) + 1,
        bottom: Math.max(...outline.map((c) => c.y)) + 1,
    };
    const brushOutline = brushBox && grid && (
        <Box
            data-testid="brush-outline"
            sx={{
                position: 'absolute',
                left: `${(brushBox.left / grid.width) * 100}%`,
                top: `${(brushBox.top / grid.height) * 100}%`,
                width: `${((brushBox.right - brushBox.left) / grid.width) * 100}%`,
                height: `${((brushBox.bottom - brushBox.top) / grid.height) * 100}%`,
                borderRadius: tool?.shape === 'round' && tool.size > 2 ? '50%' : 0,
                outline: '2px solid white',
                boxShadow: '0 0 0 3px rgba(0, 0, 0, 0.6)',
                pointerEvents: 'none',
            }}
        />
    );
    const label = onPick
        ? 'Card map: click a brick to pick its colour'
        : tool
          ? 'Card map: click or drag to change bricks'
          : 'Card map';
    const handlers = {
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerEnd,
        onPointerCancel: onPointerEnd,
        onPointerLeave: () => setHover(null),
    };

    if (!zoomable)
        return (
            <Box
                {...handlers}
                sx={{
                    position: 'relative',
                    maxWidth: '100%',
                    // while painting, a finger drag paints instead of scrolling the page
                    touchAction: active ? 'none' : 'auto',
                    cursor: active ? 'crosshair' : 'default',
                }}
            >
                <Box
                    component="canvas"
                    ref={canvasRef}
                    data-columns={grid?.width}
                    data-rows={grid?.height}
                    aria-label={label}
                    sx={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                />
                {brushOutline}
            </Box>
        );

    return (
        <Box data-testid="map-frame" data-zoom={zoom} sx={{ position: 'relative', width: '100%' }}>
            <Box
                ref={measure}
                data-testid="map-scroll"
                {...handlers}
                sx={{
                    display: 'flex',
                    overflow: 'auto',
                    // fill the window from here down to what the layout keeps at the bottom (padding, or the phone's
                    // tools), so the page itself never scrolls
                    height: `calc(100dvh - ${top}px - var(--bottom-reserve, 16px))`,
                    minHeight: 240,
                    // a finger drag paints, pinches or pans the map instead of scrolling the page
                    touchAction: 'none',
                    cursor: spaceHeld ? 'grab' : active ? 'crosshair' : 'default',
                }}
            >
                {/* centred while it fits; bigger than the box once zoomed, and then it scrolls */}
                <Box
                    sx={{
                        position: 'relative',
                        margin: 'auto',
                        flexShrink: 0,
                        width: base.width * zoom,
                        height: base.height * zoom,
                    }}
                >
                    <Box
                        component="canvas"
                        ref={canvasRef}
                        data-columns={grid?.width}
                        data-rows={grid?.height}
                        aria-label={label}
                        sx={{ display: 'block', width: '100%', height: '100%' }}
                    />
                    {brushOutline}
                </Box>
            </Box>
            <Paper
                elevation={2}
                sx={{
                    position: 'absolute',
                    // clear of the scroll bars
                    right: 20,
                    bottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: 2,
                }}
            >
                <ZoomButton
                    title="Zoom out"
                    icon={<ZoomOutIcon />}
                    onClick={() => zoomAround(1 / ZOOM_STEP)}
                    disabled={zoom <= 1}
                />
                <Typography variant="body2" aria-label="Zoom level" sx={{ minWidth: 44, textAlign: 'center' }}>
                    {Math.round(zoom * 100)}%
                </Typography>
                <ZoomButton
                    title="Zoom in"
                    icon={<ZoomInIcon />}
                    onClick={() => zoomAround(ZOOM_STEP)}
                    disabled={zoom >= MAX_ZOOM}
                />
                <ZoomButton
                    title="Fit to screen"
                    icon={<FitScreenIcon />}
                    onClick={() => applyZoom(1, { x: 0, y: 0 })}
                    disabled={zoom === 1}
                />
            </Paper>
        </Box>
    );
};

export default MosaicPreview;
