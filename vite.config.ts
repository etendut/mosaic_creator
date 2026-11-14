/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The commit shown as the app's version. CI sets COMMIT_SHA (for a PR, its head commit rather than the temporary
// merge commit it checks out); otherwise it's the checked-out commit, or empty outside a git checkout.
const commit = () => {
    if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;
    try {
        return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
            .toString()
            .trim();
    } catch {
        return '';
    }
};

// Build to one self-contained HTML file so it can be opened straight from disk (file://) in Chrome/Edge.
export default defineConfig({
    plugins: [react(), viteSingleFile()],
    define: { __COMMIT__: JSON.stringify(commit()) },
    build: {
        outDir: 'dist',
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.ts'],
        // whole-app tests rebuild the mosaic on every change, which takes a few seconds on a slow CI runner
        testTimeout: 15000,
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
