import { whereToOpen, type OpeningState } from './whereToOpen';

type Step = 'Image' | 'Bricks' | 'Cards';

/** A first visit: nothing in the URL, no projects, nothing remembered. */
const firstVisit: OpeningState<Step> = {
    route: { view: 'mosaic', projectId: null, step: 'Image' },
    blocked: false,
    projectIds: [],
    lastOpen: null,
    migratedId: null,
    hasImage: false,
    urlStep: null,
};
const open = (change: Partial<OpeningState<Step>>) => whereToOpen({ ...firstVisit, ...change }, 'Image', 'Bricks');

describe('whereToOpen', () => {
    it('opens a first visit as a new mosaic on Image, or at the step the URL names', () => {
        expect(open({})).toEqual({ to: 'new', step: 'Image' });
        expect(open({ urlStep: 'Cards' })).toEqual({ to: 'new', step: 'Cards' });
    });

    it('stays in Mosaics when you opened Mosaics', () => {
        expect(open({ route: { view: 'projects' }, projectIds: ['a'] })).toEqual({ to: 'stay' });
    });

    it('goes to Mosaics when the library is blocked (a folder that needs your OK)', () => {
        expect(open({ blocked: true })).toEqual({ to: 'mosaics' });
    });

    it("stays on the URL's project when the library has it, and goes to Mosaics when it doesn't", () => {
        const route = { view: 'mosaic' as const, projectId: 'a', step: 'Cards' as const };
        expect(open({ route, projectIds: ['a'] })).toEqual({ to: 'stay' });
        // a project from another browser, or one deleted since: not a blank editor
        expect(open({ route, projectIds: ['b'] })).toEqual({ to: 'mosaics' });
    });

    it('opens the project open last, at its step, or at Bricks; the URL step wins', () => {
        const lastOpen = { id: 'a', step: 'Cards' as const };
        expect(open({ projectIds: ['a', 'b'], lastOpen })).toEqual({ to: 'project', id: 'a', step: 'Cards' });
        expect(open({ projectIds: ['a'], lastOpen: { id: 'a', step: null } })).toEqual({
            to: 'project',
            id: 'a',
            step: 'Bricks',
        });
        expect(open({ projectIds: ['a'], lastOpen, urlStep: 'Image' })).toEqual({
            to: 'project',
            id: 'a',
            step: 'Image',
        });
    });

    it('opens the mosaic moved in from before the library, ahead of anything else', () => {
        expect(open({ projectIds: ['old', 'a'], migratedId: 'old', lastOpen: { id: 'a', step: 'Cards' } })).toEqual({
            to: 'project',
            id: 'old',
            step: 'Bricks',
        });
    });

    it('goes to Mosaics when there are projects but none was open last, or that one has gone', () => {
        expect(open({ projectIds: ['a'] })).toEqual({ to: 'mosaics' });
        expect(open({ projectIds: ['a'], lastOpen: { id: 'gone', step: 'Cards' } })).toEqual({ to: 'mosaics' });
    });

    it('keeps a picture you used before the library loaded as a new mosaic, never swapped or left for Mosaics', () => {
        // the race CI found: you used a picture, then the library arrived holding other mosaics
        expect(open({ hasImage: true, urlStep: 'Bricks', projectIds: ['a'] })).toEqual({ to: 'new', step: 'Bricks' });
        expect(open({ hasImage: true, projectIds: ['a'], lastOpen: { id: 'a', step: 'Cards' } })).toEqual({
            to: 'new',
            step: 'Bricks',
        });
    });
});
