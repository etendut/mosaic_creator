/**
 * The version people see: major.PR.0. The major comes from package.json and changes by hand for a big release; the
 * minor is the number of the pull request that brought the build in, so it only goes up (every change reaches main
 * through a PR, and GitHub numbers PRs and issues in one sequence, so it can skip). Used by vite.config.ts at build time.
 *
 * - `prNumber`: the PR being built (CI and previews set PR_NUMBER), not merged yet: 1.78.0-preview.
 * - `headSubject`: the built commit's subject. A merge commit names its PR: "Merge pull request #78 from …": 1.78.0.
 * - `lastMergeSubject`: otherwise the last merge on the branch (a local build on a feature branch): 1.77.0-dev.
 * - With none of them (no git): the major alone, as 1.0.0-dev.
 */
export const releaseVersion = ({
    packageVersion,
    prNumber,
    headSubject,
    lastMergeSubject,
}: {
    packageVersion: string;
    prNumber?: string;
    headSubject?: string;
    lastMergeSubject?: string;
}) => {
    const major = Number.parseInt(packageVersion, 10) || 0;
    const merged = (subject?: string) => subject?.match(/^Merge pull request #(\d+)\b/)?.[1];
    if (prNumber && /^\d+$/.test(prNumber)) return `${major}.${Number(prNumber)}.0-preview`;
    const here = merged(headSubject);
    if (here) return `${major}.${Number(here)}.0`;
    const last = merged(lastMergeSubject);
    return `${major}.${last ? Number(last) : 0}.0-dev`;
};
