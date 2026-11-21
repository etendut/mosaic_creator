import { screen, waitFor } from '@testing-library/react';
import { browserStore } from '../library/browserStore';
import { DEFAULT_PROJECT, packProject } from '../mosaic/project';
import { applyImage, chooseImage, renderApp } from '../test/app';
import { FAKE_PNG } from '../test/fakes';

// a slow first read of the library, as on a busy machine: long enough to use a picture before it arrives
vi.mock('../library/meta', async (importOriginal) => {
    const real = await importOriginal<typeof import('../library/meta')>();
    return {
        ...real,
        readMeta: async () => {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return real.readMeta();
        },
    };
});

describe('<App /> when the library is slow to read', () => {
    it('keeps a picture you used before it arrived as a new mosaic, on Bricks, not sent to Mosaics', async () => {
        // a mosaic saved on an earlier visit, with nothing recorded as open last
        const savedAt = new Date();
        const zip = packProject({
            settings: DEFAULT_PROJECT,
            image: FAKE_PNG,
            meta: { id: 'earlier', name: 'Earlier', savedAt: savedAt.toISOString() },
        });
        await browserStore.write(
            { id: 'earlier', name: 'Earlier', savedAt, bricks: null, size: zip.byteLength, thumbnail: null },
            zip,
        );

        const user = renderApp();
        await chooseImage(user);
        await applyImage(user);
        expect(window.location.hash).toBe('#/bricks');

        // once the library arrives, the new mosaic joins the URL and you stay on it
        await waitFor(() => expect(window.location.hash).toMatch(/^#\/(?!earlier)[\w-]+\/bricks$/));
        expect(screen.getByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Mosaics', level: 1 })).not.toBeInTheDocument();
    });
});
