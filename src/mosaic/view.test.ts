import { clampView, FIT, MAX_ZOOM, panBy, zoomAt } from './view';

describe('zoom and pan', () => {
    it('zooms around a point, keeping it in place', () => {
        // zoom 2× about the frame's centre: the centre stays put
        const v = zoomAt(FIT, 2, 50, 40, 100, 80);
        expect(v).toEqual({ zoom: 2, x: -50, y: -40 });
        // the content point under the centre is still (50, 40) in the frame
        expect((50 - v.x) / v.zoom).toBe(50 - 0);
        // zooming about the top-left corner keeps that corner
        expect(zoomAt(FIT, 3, 0, 0, 100, 80)).toEqual({ zoom: 3, x: 0, y: 0 });
    });

    it('keeps the zoom between fit and its limit', () => {
        expect(zoomAt(FIT, 0.5, 10, 10, 100, 80)).toEqual(FIT);
        expect(zoomAt(FIT, 100, 0, 0, 100, 80).zoom).toBe(MAX_ZOOM);
    });

    it('pans, but never past the content’s edges', () => {
        const zoomed = { zoom: 2, x: -50, y: -40 };
        expect(panBy(zoomed, 20, -10, 100, 80)).toEqual({ zoom: 2, x: -30, y: -50 });
        // the content is 200 × 160 in a 100 × 80 frame: it moves from 0 to -100 across, 0 to -80 down
        expect(panBy(zoomed, 500, 500, 100, 80)).toEqual({ zoom: 2, x: 0, y: 0 });
        expect(panBy(zoomed, -500, -500, 100, 80)).toEqual({ zoom: 2, x: -100, y: -80 });
        // at fit there's nothing to pan
        expect(panBy(FIT, 30, 30, 100, 80)).toEqual(FIT);
        expect(clampView({ zoom: 0.2, x: 5, y: 5 }, 100, 80)).toEqual(FIT);
    });
});
