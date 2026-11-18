import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { clampZoom, scrollForZoom } from '../mosaic/view';

export type Point = { x: number; y: number };

/**
 * The scrolling box's size, for fitting the map to it, and where it starts on the page, so it can fill exactly from
 * there to the bottom of the window; again whenever the window or the page's layout changes. Returns a ref callback
 * for the box, and keeps `scrollRef` pointing at it.
 */
export const useMeasuredBox = (scrollRef: RefObject<HTMLDivElement | null>) => {
    const [box, setBox] = useState({ width: 0, height: 0 });
    const [top, setTop] = useState(0);
    const measure = useCallback(
        (el: HTMLDivElement | null) => {
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
        },
        [scrollRef],
    );
    return { measure, box, top };
};

/**
 * The map's zoom, kept with the scroll so the point it zooms around stays put. `base` is the map's size at zoom 1.
 * With `wheel`, Ctrl + wheel (and a trackpad pinch, which arrives as one) zooms around the pointer.
 */
export const useZoom = (
    scrollRef: RefObject<HTMLDivElement | null>,
    base: { width: number; height: number },
    wheel: boolean,
) => {
    const [zoom, setZoom] = useState(1);
    // the zoom as of the last change, for handlers that run before a re-render; and the scroll to apply once a new
    // zoom is laid out
    const zoomRef = useRef(1);
    const nextScroll = useRef<Point | null>(null);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);
    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el || !nextScroll.current) return;
        el.scrollLeft = nextScroll.current.x;
        el.scrollTop = nextScroll.current.y;
        nextScroll.current = null;
    }, [zoom, scrollRef]);

    /** Zoom to `to`, scrolled to `scroll`; or just scroll, if the zoom isn't changing. */
    const applyZoom = useCallback(
        (to: number, scroll: Point) => {
            const el = scrollRef.current;
            if (!el) return;
            if (to === zoomRef.current) {
                el.scrollLeft = scroll.x;
                el.scrollTop = scroll.y;
                return;
            }
            nextScroll.current = scroll;
            zoomRef.current = to;
            setZoom(to);
        },
        [scrollRef],
    );

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
        [scrollRef, applyZoom, base.width, base.height],
    );

    // listened to directly, as React's wheel listener can't stop the page zooming; a plain wheel scrolls
    useEffect(() => {
        const el = scrollRef.current;
        if (!wheel || !el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            const r = el.getBoundingClientRect();
            zoomAround(Math.exp(-e.deltaY * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [wheel, zoomAround, scrollRef]);

    return { zoom, zoomRef, applyZoom, zoomAround };
};

/** Whether Space is held, to pan with the mouse as in a photo editor (not while typing). */
export const useSpaceHeld = (enabled: boolean) => {
    const [held, setHeld] = useState(false);
    useEffect(() => {
        if (!enabled) return;
        const typing = (e: KeyboardEvent) => (e.target as HTMLElement | null)?.closest?.('input, textarea') != null;
        const down = (e: KeyboardEvent) => {
            if (e.code !== 'Space' || typing(e)) return;
            e.preventDefault();
            setHeld(true);
        };
        const up = (e: KeyboardEvent) => e.code === 'Space' && setHeld(false);
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
        };
    }, [enabled]);
    return held;
};
