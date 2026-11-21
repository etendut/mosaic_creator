import type { Route } from '../hooks/useStepRoute';

/** Where the app goes once its library has been read: nowhere new, Mosaics, a saved project, or a new one. */
export type Opening<S extends string> =
    { to: 'stay' } | { to: 'mosaics' } | { to: 'project'; id: string; step: S } | { to: 'new'; step: S };

export interface OpeningState<S extends string> {
    /** The route as the app mounted, or as you've moved it since. */
    route: Route<S>;
    /** The library couldn't be read (a folder that needs your OK again). */
    blocked: boolean;
    /** The projects the library holds. */
    projectIds: readonly string[];
    /** The project open last visit, and its step, if any. */
    lastOpen: { id: string; step: S | null } | null;
    /** The project made from the old single remembered mosaic on this first run, if any. */
    migratedId: string | null;
    /** A picture is already in use: you used one before the library finished loading. */
    hasImage: boolean;
    /** The step the URL names, if any. */
    urlStep: S | null;
}

/**
 * Where the app opens, once the library has been read (docs/design-system/README.md, Two views): the URL's project;
 * a picture you've already used, as a new mosaic; else the project open last; else Mosaics when there are projects;
 * else a new mosaic on Image (a first visit).
 */
export const whereToOpen = <S extends string>(state: OpeningState<S>, image: S, bricks: S): Opening<S> => {
    const { route, blocked, projectIds, lastOpen, migratedId, hasImage, urlStep } = state;
    if (route.view === 'projects') return { to: 'stay' };
    if (blocked) return { to: 'mosaics' };
    const known = (id: string | null): id is string => !!id && projectIds.includes(id);
    if (route.projectId) return known(route.projectId) ? { to: 'stay' } : { to: 'mosaics' };
    // a picture already in use: a new mosaic, kept where you are, not swapped for the one open last or left behind
    if (hasImage) return { to: 'new', step: urlStep ?? bricks };
    const id = migratedId ?? lastOpen?.id ?? null;
    if (known(id)) {
        const lastStep = lastOpen?.id === id ? lastOpen.step : null;
        return { to: 'project', id, step: urlStep ?? lastStep ?? bricks };
    }
    if (projectIds.length > 0) return { to: 'mosaics' };
    return { to: 'new', step: urlStep ?? image };
};
