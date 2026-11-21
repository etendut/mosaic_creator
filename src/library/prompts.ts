/** At most one prompt a visit (docs/design-system/README.md, Prompts): the first Mosaics view to show one claims it. */
let shown = false;

/** True the first time in a visit, then false. */
export const claimPrompt = () => {
    if (shown) return false;
    shown = true;
    return true;
};

/** For tests: start a new visit. */
export const resetPrompts = () => {
    shown = false;
};
