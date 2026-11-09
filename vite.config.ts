/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build to one self-contained HTML file so it can be opened straight from disk (file://) in Chrome/Edge.
export default defineConfig({
    plugins: [react(), viteSingleFile()],
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
