import { useRef, useState, type PointerEvent, type RefObject } from 'react';
import { brushCells, type BrickTool, type Edit } from '../mosaic/touchUp';
import type { Cell, PixelGrid } from '../mosaic/types';
import { clampZoom, contentAt, scrollToPut } from '../mosaic/view';
import type { Mosaic } from './useMosaic';
import type { Point } from './useZoomableMap';

interface Gesture {
    kind: 'pan' | 'pinch';
    start: Point;
    scroll: Point;
    zoom: number;
    distance: number;
    content: Point;
}

interface MapPointerOptions {
    grid: PixelGrid | null;
    tool: BrickTool | null;
    onPick: ((cell: Cell) => void) | null;
    editBricks: Mosaic['editBricks'];
    zoomable: boolean;
    spaceHeld: boolean;
    canvasRef: RefObject<HTMLCanvasElement | null>;
    scrollRef: RefObject<HTMLDivElement | null>;
    zoomRef: RefObject<number>;
    applyZoom: (to: number, scroll: Point) => void;
    base: { width: number; height: number };
}

const pointIn = (e: PointerEvent<HTMLDivElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
};

const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * The map's pointer handling: paint or pick with a mouse, pen or finger; on a zoomable map, pinch to zoom, and pan
 * with two fingers, the middle button or Space + drag. A finger's brick waits until it moves or lifts, in case a
 * second finger turns it into a pinch, so a pinch never paints. Returns the handlers and the brick under the mouse.
 */
export const useMapPointer = (o: MapPointerOptions) => {
    const { grid, tool, onPick, zoomable, canvasRef, scrollRef, zoomRef } = o;
    // the map takes clicks when painting, erasing or picking a colour
    const active = !!tool || !!onPick;
    const [hover, setHover] = useState<Point | null>(null);
    // during a drag: the last brick the pointer was over, and whether this drag has changed anything yet (its first
    // change starts a new undo step, the rest join it)
    const stroke = useRef<{ last: string; started: boolean } | null>(null);
    // the pointers on the map, for pinching; a finger's pending brick; and what a pan or pinch started from
    const pointers = useRef(new Map<number, Point>());
    const pending = useRef<{ id: number; cell: Point } | null>(null);
    const gesture = useRef<Gesture | null>(null);

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
        o.editBricks(edits, { newStep: !stroke.current.started });
        stroke.current.started = true;
    };

    /** A press on a brick: pick its colour, or start painting there. */
    const press = (cell: Point) => {
        if (onPick) return onPick(grid!.rows[cell.y][cell.x]);
        stroke.current = { last: '', started: false };
        paint(cell);
    };

    /** A second finger: pinch and pan, and the first finger's brick is never painted. */
    const startPinch = (el: HTMLDivElement) => {
        pending.current = null;
        stroke.current = null;
        const [a, b] = [...pointers.current.values()];
        const start = midpoint(a, b);
        gesture.current = {
            kind: 'pinch',
            start,
            scroll: { x: el.scrollLeft, y: el.scrollTop },
            zoom: zoomRef.current,
            distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
            content: {
                x: contentAt(zoomRef.current, start.x, el.scrollLeft, o.base.width, el.clientWidth),
                y: contentAt(zoomRef.current, start.y, el.scrollTop, o.base.height, el.clientHeight),
            },
        };
    };

    /** Zoom by how far the fingers spread, keeping the content that was between them between them. */
    const pinchTo = (g: Gesture, el: HTMLDivElement) => {
        const [a, b] = [...pointers.current.values()];
        const mid = midpoint(a, b);
        const to = clampZoom((g.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.distance);
        o.applyZoom(to, {
            x: scrollToPut(g.content.x, to, mid.x, o.base.width, el.clientWidth),
            y: scrollToPut(g.content.y, to, mid.y, o.base.height, el.clientHeight),
        });
    };

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (!zoomable && !active) return;
        const at = pointIn(e);
        pointers.current.set(e.pointerId, at);
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const el = zoomable ? scrollRef.current : null;
        if (el && pointers.current.size === 2) return startPinch(el);
        if (el && e.pointerType === 'mouse' && (e.button === 1 || o.spaceHeld)) {
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

    /** Move a pan or pinch in progress. */
    const moveGesture = (g: Gesture, el: HTMLDivElement, at: Point) => {
        if (g.kind === 'pan') {
            el.scrollLeft = g.scroll.x - (at.x - g.start.x);
            el.scrollTop = g.scroll.y - (at.y - g.start.y);
        } else if (pointers.current.size === 2) pinchTo(g, el);
    };

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        const at = pointIn(e);
        if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, at);
        const el = scrollRef.current;
        if (gesture.current && el) return moveGesture(gesture.current, el, at);
        if (!active) return;
        const cell = cellAt(e);
        setHover(e.pointerType === 'mouse' && !o.spaceHeld ? cell : null);
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

    return {
        active,
        hover,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: onPointerEnd,
            onPointerCancel: onPointerEnd,
            onPointerLeave: () => setHover(null),
        },
    };
};
