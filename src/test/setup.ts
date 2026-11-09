import '@testing-library/jest-dom/vitest';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { createElement, useEffect } from 'react';
import { afterEach, vi } from 'vitest';
import { installFakes, resetFakes } from './fakes';

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
    // each test starts as a first visit: nothing remembered
    localStorage.clear();
    globalThis.indexedDB = new IDBFactory();
    resetFakes();
});
