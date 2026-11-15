/**
 * Zooming a canvas inside a scrolling box: at zoom 1 the canvas fits the box; zoomed in, it's bigger than the box and
 * scrolls. When it's smaller than the box along an axis, it's centred along that axis.
 */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** The scale at which content `contentW` × `contentH` fits a `boxW` × `boxH` box, keeping its shape. */
export const fitScale = (contentW: number, contentH: number, boxW: number, boxH: number) =>
    contentW > 0 && contentH > 0 && boxW > 0 && boxH > 0 ? Math.min(boxW / contentW, boxH / contentH) : 0;

/**
 * Along one axis: the scroll position that keeps the content point under `point` (in box pixels) there when the zoom
 * goes from `from` to `to`. `base` is the content's size at zoom 1, `box` the box's size, `scroll` the current scroll.
 */
export const scrollForZoom = (from: number, to: number, point: number, scroll: number, base: number, box: number) => {
    // centring offset when the content is smaller than the box
    const offset = (zoom: number) => Math.max(0, (box - base * zoom) / 2);
    const content = (scroll + point - offset(from)) / from;
    const next = content * to + offset(to) - point;
    return Math.min(Math.max(0, base * to - box), Math.max(0, next));
};

/** The content point (at zoom 1) under `point` in the box, along one axis. */
export const contentAt = (zoom: number, point: number, scroll: number, base: number, box: number) =>
    (scroll + point - Math.max(0, (box - base * zoom) / 2)) / zoom;

/** The scroll that puts the content point `content` (at zoom 1) under `point` in the box, along one axis. */
export const scrollToPut = (content: number, zoom: number, point: number, base: number, box: number) =>
    Math.min(
        Math.max(0, base * zoom - box),
        Math.max(0, content * zoom + Math.max(0, (box - base * zoom) / 2) - point),
    );

/** The resolution to draw at for a zoom: steps of 1, 2, 4 and 8, so zooming redraws only now and then. */
export const drawZoom = (zoom: number) => 2 ** Math.ceil(Math.log2(clampZoom(zoom)));
