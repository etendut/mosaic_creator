import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { createElement, useEffect } from 'react';
import { afterEach, vi } from 'vitest';
import { installFakes, resetFakes } from './fakes';
import { resetPrompts } from '../library/prompts';
import { autosave } from '../library/useProjectSession';

// saves come soon after a change, so tests needn't wait the real two seconds
autosave.ms = 10;
// the app reads its library from IndexedDB as it starts, and a first visit moves the old remembered mosaic in: about a
// second here under coverage, and CI runs two to three times slower. A wait ends as soon as its element appears, so
// this only lengthens a real failure.
configure({ asyncUtilTimeout: 6000 });

installFakes();

// The cropper measures its own layout, which jsdom can't do. This stand-in reports the whole image as the crop
// area, as react-easy-crop does once an image has loaded.
vi.mock('react-easy-crop', () => ({
    default: function FakeCropper(props: {
        image: string;
        onCropComplete?: (area: object, pixels: object) => void;
        onZoomChange?: (zoom: number) => void;
    }) {
        const { image, onCropComplete } = props;
        useEffect(() => {
            onCropComplete?.({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 400, height: 250 });
            // once per image, as the real cropper does; the callback is a new function every render
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [image]);
        return createElement('img', { src: image, alt: 'Crop preview', 'data-testid': 'cropper' });
    },
}));

afterEach(() => {
    // unmount first: unmounting runs any effects still pending, such as the app's start once its library has loaded,
    // which can write a project into the URL; reset after that, or it leaks into the next test
    cleanup();
    // each test starts as a first visit: nothing remembered, and no step in the URL
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    globalThis.indexedDB = new IDBFactory();
    resetFakes();
    resetPrompts();
});
