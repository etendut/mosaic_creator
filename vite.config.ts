/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { releaseVersion } from './src/lib/releaseVersion';

/** A git command's output, or undefined outside a git checkout. */
const git = (command: string) => {
    try {
        return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return undefined;
    }
};

// The commit the app was built from: it versions the service worker, and About links to it. CI sets COMMIT_SHA (for a
// PR, its head commit rather than the temporary merge commit it checks out); otherwise the checked-out commit, or
// empty outside a git checkout.
const commit = () => process.env.COMMIT_SHA || git('rev-parse HEAD') || '';

/**
 * The version people see: major.PR.0 (src/lib/releaseVersion.ts). The major is package.json's, changed by hand for a
 * big release; CI and previews set PR_NUMBER for a PR being built; a deploy builds main's merge commit, which names
 * its PR.
 */
const appVersion = () =>
    releaseVersion({
        packageVersion: JSON.parse(readFileSync('package.json', 'utf8')).version,
        prNumber: process.env.PR_NUMBER,
        headSubject: git('log -1 --format=%s'),
        lastMergeSubject: git('log --merges --first-parent -1 --format=%s'),
    });

/** Writes the commit into the built service worker, so each deploy is a changed sw.js and installs as a new version. */
const versionServiceWorker = (): Plugin => ({
    name: 'version-service-worker',
    apply: 'build',
    async closeBundle() {
        const file = 'dist/sw.js';
        const source = await readFile(file, 'utf8');
        await writeFile(file, source.replace('__COMMIT__', commit() || 'dev'));
    },
});

// Build to one self-contained HTML file so it can be opened straight from disk (file://) in Chrome/Edge. The Pages
// deploy also gets public/: the manifest, the icons and the service worker that make it an installable, offline app.
export default defineConfig({
    plugins: [react(), viteSingleFile(), versionServiceWorker()],
    // the commit still versions the service worker, so every deploy installs as an update, whatever the version says
    define: { __COMMIT__: JSON.stringify(commit()), __APP_VERSION__: JSON.stringify(appVersion()) },
    build: {
        outDir: 'dist',
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        // the longest whole-app journeys (Touch up's colour counts, the Walkthrough's eight stops) take about 10s here
        // under coverage and CI runs about 1.6 times slower: room for those, until they're thinned into step tests
        testTimeout: 30000,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            // the entry point only mounts <App />; test helpers aren't app code
            exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}'],
            reporter: ['text', 'html'],
            thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
        },
    },
});
