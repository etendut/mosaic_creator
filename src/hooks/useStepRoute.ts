import { useCallback, useEffect, useState } from 'react';

/** A step's name as it appears in the URL: "Touch up" → "touch-up". */
export const stepSlug = (step: string) => step.toLowerCase().replace(/\s+/g, '-');

/**
 * The current step, kept in the URL's hash (`#/bricks`), so a refresh comes back to it and the browser's back and
 * forward buttons move between steps. A hash works on GitHub Pages, which has no server routing, and leaves the PR
 * previews' base path alone.
 */
export const useStepRoute = <S extends string>(steps: readonly S[], first: S) => {
    const inUrl = useCallback(
        (): S | null => steps.find((s) => window.location.hash === `#/${stepSlug(s)}`) ?? null,
        [steps],
    );
    const [step, setStep] = useState<S>(() => inUrl() ?? first);

    /** Go to a step: a new history entry, or with `replace`, in place of the current one. */
    const go = useCallback((to: S, options: { replace?: boolean } = {}) => {
        setStep(to);
        const hash = `#/${stepSlug(to)}`;
        if (window.location.hash === hash) return;
        if (options.replace) window.history.replaceState(null, '', hash);
        else window.history.pushState(null, '', hash);
    }, []);

    // back and forward
    useEffect(() => {
        const onPop = () => setStep(inUrl() ?? first);
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, [inUrl, first]);

    return { step, go, inUrl };
};
