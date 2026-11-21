/** The version people see: major.PR.0, such as 1.78.0 (src/lib/releaseVersion.ts). */
export const VERSION = __APP_VERSION__;

/** The git commit the app was built from, filled in by vite.config.ts; empty when it couldn't be read. */
export const COMMIT = __COMMIT__;

/** Which build this is, for a bug report: the commit's first 7 characters, as GitHub shows them. */
export const BUILD = COMMIT ? COMMIT.slice(0, 7) : null;

export const REPO_URL = 'https://github.com/etendut/mosaic_creator';

export const COMMIT_URL = COMMIT ? `${REPO_URL}/commit/${COMMIT}` : null;
