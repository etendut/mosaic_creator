/**
 * Zoom and pan for a canvas shown in a fixed frame: the content is scaled by `zoom` from the frame's top-left corner,
 * then moved by (`x`, `y`) in frame pixels. At zoom 1 the content exactly fills the frame.
 */
export interface View {
    zoom: number;
    x: number;
    y: number;
}

export const FIT: View = { zoom: 1, x: 0, y: 0 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Keep the zoom in range, and the content covering the frame: no gap opens at any edge. */
export const clampView = (view: View, width: number, height: number): View => {
    const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
    return {
        zoom,
        x: clamp(view.x, width - width * zoom, 0),
        y: clamp(view.y, height - height * zoom, 0),
    };
};

/** Zoom by `factor` keeping the point (`px`, `py`) of the frame where it is: under the pointer, or between fingers. */
export const zoomAt = (view: View, factor: number, px: number, py: number, width: number, height: number): View => {
    const zoom = clamp(view.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const ratio = zoom / view.zoom;
    return clampView({ zoom, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, width, height);
};

/** Move the content by (`dx`, `dy`) frame pixels. */
export const panBy = (view: View, dx: number, dy: number, width: number, height: number): View =>
    clampView({ ...view, x: view.x + dx, y: view.y + dy }, width, height);
