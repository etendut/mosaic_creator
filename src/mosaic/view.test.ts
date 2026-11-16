import { clampZoom, contentAt, drawZoom, fitScale, MAX_ZOOM, scrollForZoom, scrollToPut } from './view';

describe('zooming in a scrolling box', () => {
    it('fits the content to the box, keeping its shape', () => {
        expect(fitScale(800, 500, 400, 400)).toBe(0.5);
        expect(fitScale(800, 500, 1600, 500)).toBe(1);
        expect(fitScale(0, 500, 400, 400)).toBe(0);
    });

    it('keeps the point under the pointer in place as it zooms', () => {
        // a 400 px wide map in a 400 px box: zoom 2× about x = 100
        const scroll = scrollForZoom(1, 2, 100, 0, 400, 400);
        expect(scroll).toBe(100);
        // the content under the pointer (x = 100 at zoom 1) is still there
        expect(contentAt(2, 100, scroll, 400, 400)).toBe(100);
        // zooming back out scrolls back to the start
        expect(scrollForZoom(2, 1, 100, scroll, 400, 400)).toBe(0);
    });

    it('allows for the centring gap when the content is narrower than the box', () => {
        // a 200 px wide map centred in a 400 px box: 100 px gap each side; zoom 3× about the middle
        expect(contentAt(1, 200, 0, 200, 400)).toBe(100);
        const scroll = scrollForZoom(1, 3, 200, 0, 200, 400);
        expect(contentAt(3, 200, scroll, 200, 400)).toBeCloseTo(100);
    });

    it('never scrolls past the content', () => {
        expect(scrollForZoom(1, 2, 400, 0, 400, 400)).toBe(400);
        expect(scrollForZoom(1, 2, 0, 0, 400, 400)).toBe(0);
        expect(scrollToPut(399, 2, 0, 400, 400)).toBe(400);
        expect(scrollToPut(-50, 2, 0, 400, 400)).toBe(0);
    });

    it('limits the zoom, and redraws in steps', () => {
        expect(clampZoom(0.5)).toBe(1);
        expect(clampZoom(100)).toBe(MAX_ZOOM);
        expect([1, 1.2, 2, 2.5, 5, 9, 20, 50].map(drawZoom)).toEqual([1, 2, 2, 4, 8, 16, 32, 32]);
    });
});
