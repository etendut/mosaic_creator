import { releaseVersion } from './releaseVersion';

const packageVersion = '1.0.0';

describe('releaseVersion', () => {
    it("names a deployed build by its merge's PR: major.PR.0", () => {
        expect(releaseVersion({ packageVersion, headSubject: 'Merge pull request #78 from etendut/feature/x' })).toBe(
            '1.78.0',
        );
    });

    it('takes the major from package.json, and only the major', () => {
        expect(releaseVersion({ packageVersion: '2.5.9', headSubject: 'Merge pull request #120 from a/b' })).toBe(
            '2.120.0',
        );
    });

    it('marks a PR being built (CI, previews) as a preview of the number it will get', () => {
        expect(releaseVersion({ packageVersion, prNumber: '78', headSubject: 'Some change' })).toBe('1.78.0-preview');
        // the PR number wins over what the checked-out commit says
        expect(releaseVersion({ packageVersion, prNumber: '79', headSubject: 'Merge pull request #78 from a/b' })).toBe(
            '1.79.0-preview',
        );
    });

    it('marks a local build after the last merge as dev', () => {
        expect(
            releaseVersion({
                packageVersion,
                headSubject: 'A change on a branch',
                lastMergeSubject: 'Merge pull request #77 from etendut/fix/y',
            }),
        ).toBe('1.77.0-dev');
    });

    it('falls back to the major alone without git, and ignores a PR number that is not a number', () => {
        expect(releaseVersion({ packageVersion })).toBe('1.0.0-dev');
        expect(releaseVersion({ packageVersion, prNumber: '' })).toBe('1.0.0-dev');
        expect(releaseVersion({ packageVersion, prNumber: 'abc' })).toBe('1.0.0-dev');
        expect(releaseVersion({ packageVersion, headSubject: 'Merge branch main into x' })).toBe('1.0.0-dev');
    });
});
