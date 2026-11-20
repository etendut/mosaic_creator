import { Box } from '@mui/material';
import { useEffect, useRef } from 'react';
import { tokens } from '../app/theme';
import { drawPreview } from '../mosaic/image';
import { brushCells, type BrickTool } from '../mosaic/touchUp';
import type { Cell, PixelGrid } from '../mosaic/types';
import { drawZoom, fitScale } from '../mosaic/view';
import type { Mosaic } from '../hooks/useMosaic';
import { useMapPointer } from '../hooks/useMapPointer';
import { useMeasuredBox, useSpaceHeld, useZoom, type Point } from '../hooks/useZoomableMap';
import ZoomControl from '../ui/ZoomControl';

/** Target on-screen width of the preview; the canvas is scaled down with CSS if the window is narrower. */
const PREVIEW_WIDTH_PX = 1200;
/** Each press of + or − zooms by this much. */
const ZOOM_STEP = 1.5;
/** The biggest the zoomable map's canvas is drawn, so a big mosaic zoomed right in doesn't need a huge canvas. */
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

/**
 * How many pixels each brick is drawn with: sharp for the size it's shown at. A fixed map draws for its preview
 * width; a zoomable one redraws at each power of two of zoom, within the canvas size limit.
 */
const cellPixels = (grid: PixelGrid | null, zoomable: boolean, scale: number, zoom: number) => {
    if (!grid) return 4;
    // a fixed map: 4–24 px a brick for its preview width, but never past the canvas size limit (a 1,920-brick-wide
    // mosaic at 4 px would be a 44-megapixel canvas, shown a few hundred pixels wide)
    const fitCanvas = Math.max(1, Math.floor(MAX_CANVAS_PX / Math.max(grid.width, grid.height)));
    if (!zoomable || scale === 0)
        return Math.min(fitCanvas, Math.max(4, Math.min(24, Math.floor(PREVIEW_WIDTH_PX / grid.width))));
    const wanted = Math.round(scale * drawZoom(zoom) * (window.devicePixelRatio || 1));
    return Math.min(fitCanvas, Math.max(4, wanted));
};

/** The outline of the brush around the bricks it covers (one brick for the eyedropper), positioned in % of the map. */
const BrushOutline = ({ grid, hover, tool }: { grid: PixelGrid; hover: Point; tool: BrickTool | null }) => {
    const cells = brushCells(hover.x, hover.y, { size: tool?.size ?? 1, shape: 'square' }, grid);
    if (cells.length === 0) return null;
    const left = Math.min(...cells.map((c) => c.x));
    const top = Math.min(...cells.map((c) => c.y));
    const right = Math.max(...cells.map((c) => c.x)) + 1;
    const bottom = Math.max(...cells.map((c) => c.y)) + 1;
    return (
        <Box
            data-testid="brush-outline"
            sx={{
                position: 'absolute',
                left: `${(left / grid.width) * 100}%`,
                top: `${(top / grid.height) * 100}%`,
                width: `${((right - left) / grid.width) * 100}%`,
                height: `${((bottom - top) / grid.height) * 100}%`,
                borderRadius: tool?.shape === 'round' && tool.size > 2 ? '50%' : 0,
                outline: `2px solid ${tokens.brushOutline}`,
                boxShadow: `0 0 0 3px ${tokens.brushHalo}`,
                pointerEvents: 'none',
            }}
        />
    );
};

const mapLabel = (tool: BrickTool | null, picking: boolean) => {
    if (picking) return 'Card map: click a brick to pick its colour';
    return tool ? 'Card map: click or drag to change bricks' : 'Card map';
};

const MosaicPreview = ({ mosaic, tool = null, showGrid, onPick = null, zoomable = false }: MosaicPreviewProps) => {
    const { brick, plate, cellsPerSide, editBricks } = mosaic;
    const grid = showGrid ?? mosaic.grid;
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { measure, box, top } = useMeasuredBox(scrollRef);

    // the map's size at zoom 1: as big as fits the box, keeping its shape
    const scale = grid ? fitScale(grid.width, grid.height, box.width, box.height) : 0;
    const base = { width: (grid?.width ?? 0) * scale, height: (grid?.height ?? 0) * scale };
    const { zoom, zoomRef, applyZoom, zoomAround } = useZoom(scrollRef, base, zoomable);
    const spaceHeld = useSpaceHeld(zoomable);
    const { active, hover, handlers } = useMapPointer({
        grid,
        tool,
        onPick,
        editBricks,
        zoomable,
        spaceHeld,
        canvasRef,
        scrollRef,
        zoomRef,
        applyZoom,
        base,
    });

    const cellPx = cellPixels(grid, zoomable, scale, zoom);
    useEffect(() => {
        if (!grid || !canvasRef.current) return;
        drawPreview(canvasRef.current, grid, {
            cellPx,
            isRound: brick.isRound,
            background: plate.color.hex,
            cellsPerCard: cellsPerSide,
        });
    }, [grid, brick.isRound, plate.color.hex, cellsPerSide, cellPx]);

    const outline = active && hover && grid && <BrushOutline grid={grid} hover={hover} tool={tool} />;
    const canvas = (fill: boolean) => (
        <Box
            component="canvas"
            ref={canvasRef}
            data-columns={grid?.width}
            data-rows={grid?.height}
            aria-label={mapLabel(tool, !!onPick)}
            sx={
                fill
                    ? { display: 'block', width: '100%', height: '100%' }
                    : { display: 'block', maxWidth: '100%', height: 'auto' }
            }
        />
    );

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
                {canvas(false)}
                {outline}
            </Box>
        );

    let cursor = 'default';
    if (spaceHeld) cursor = 'grab';
    else if (active) cursor = 'crosshair';
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
                    cursor,
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
                    {canvas(true)}
                    {outline}
                </Box>
            </Box>
            <ZoomControl
                zoom={zoom}
                onZoomOut={() => zoomAround(1 / ZOOM_STEP)}
                onZoomIn={() => zoomAround(ZOOM_STEP)}
                onFit={() => applyZoom(1, { x: 0, y: 0 })}
            />
        </Box>
    );
};

export default MosaicPreview;
