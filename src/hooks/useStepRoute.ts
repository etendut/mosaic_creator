import { useCallback, useEffect, useState } from 'react';

/** A step's name as it appears in the URL: "Touch up" → "touch-up". */
export const stepSlug = (step: string) => step.toLowerCase().replace(/\s+/g, '-');

/** The step a slug names, if any. */
export const stepFromSlug = <S extends string>(slug: string, steps: readonly S[]) =>
    steps.find((s) => stepSlug(s) === slug) ?? null;

/** Where the app is: the Mosaics view, or one project at one step (null: the open project). */
export type Route<S extends string> = { view: 'projects' } | { view: 'mosaic'; projectId: string | null; step: S };

const PROJECTS_HASH = '#/mosaics';

/**
 * Read a hash: `#/mosaics`, `#/<project>/<step>`, or `#/<step>` from before there were projects (the open one).
 * Anything else is null.
 */
export const parseRoute = <S extends string>(hash: string, steps: readonly S[]): Route<S> | null => {
    if (hash === PROJECTS_HASH) return { view: 'projects' };
    const parts = hash.replace(/^#\//, '').split('/');
    const step = steps.find((s) => stepSlug(s) === parts[parts.length - 1]);
    if (!hash.startsWith('#/') || !step || parts.length > 2) return null;
    return { view: 'mosaic', projectId: parts.length === 2 ? decodeURIComponent(parts[0]) : null, step };
};

export const routeHash = <S extends string>(route: Route<S>) =>
    route.view === 'projects'
        ? PROJECTS_HASH
        : ['#', route.projectId && encodeURIComponent(route.projectId), stepSlug(route.step)].filter(Boolean).join('/');

/**
 * The view, project and step, kept in the URL's hash (`#/mosaics`, `#/<project>/bricks`), so a refresh comes back
 * to them and the browser's back and forward buttons move between them. A hash works on GitHub Pages, which has no
 * server routing, and leaves the PR previews' base path alone. `projectId` is the open project, used when moving
 * between its steps.
 */
export const useStepRoute = <S extends string>(steps: readonly S[], first: S, projectId: string | null = null) => {
    const inHash = useCallback(() => parseRoute(window.location.hash, steps), [steps]);
    const [route, setRoute] = useState<Route<S>>(() => inHash() ?? { view: 'mosaic', projectId: null, step: first });
    const navigate = useCallback((to: Route<S>, options: { replace?: boolean } = {}) => {
        setRoute(to);
        const hash = routeHash(to);
        if (window.location.hash === hash) return;
        if (options.replace) window.history.replaceState(null, '', hash);
        else window.history.pushState(null, '', hash);
    }, []);

    /** Go to a step of the open project: a new history entry, or with `replace`, in place of the current one. */
    const go = useCallback(
        (to: S, options: { replace?: boolean } = {}) => navigate({ view: 'mosaic', projectId, step: to }, options),
        [navigate, projectId],
    );
    const goProjects = useCallback(
        (options: { replace?: boolean } = {}) => navigate({ view: 'projects' }, options),
        [navigate],
    );
    const goProject = useCallback(
        (id: string, step: S, options: { replace?: boolean } = {}) =>
            navigate({ view: 'mosaic', projectId: id, step }, options),
        [navigate],
    );

    // back and forward
    useEffect(() => {
        const onPop = () => setRoute(inHash() ?? { view: 'mosaic', projectId: null, step: first });
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [inHash, first]);

    /** The step in the URL, if it names one. */
    const inUrl = useCallback((): S | null => {
        const r = inHash();
        return r?.view === 'mosaic' ? r.step : null;
    }, [inHash]);

    return { route, go, goProjects, goProject, inUrl };
};
