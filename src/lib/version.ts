/** The git commit the app was built from, filled in by vite.config.ts; empty when it couldn't be read. */
export const COMMIT = __COMMIT__;

/** The version shown to people: the commit's first 8 characters. */
export const VERSION = COMMIT ? COMMIT.slice(0, 8) : 'unknown';

export const REPO_URL = 'https://github.com/etendut/mosaic_creator';

export const COMMIT_URL = COMMIT ? `${REPO_URL}/commit/${COMMIT}` : null;
