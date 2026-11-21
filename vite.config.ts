/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The commit shown as the app's version. CI sets COMMIT_SHA (for a PR, its head commit rather than the temporary
// merge commit it checks out); otherwise it's the checked-out commit, or empty outside a git checkout.
const commit = () => {
    if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;
    try {
        // eslint-disable-next-line sonarjs/no-os-command-from-path -- build time only, on the developer's or CI's own git
        return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return '';
    }
};

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
    define: { __COMMIT__: JSON.stringify(commit()) },
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
