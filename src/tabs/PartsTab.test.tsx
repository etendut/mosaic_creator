import { screen, within } from '@testing-library/react';
import { goTo, startMosaic } from '../test/app';
import { downloads, lastDownloadText } from '../test/fakes';

describe('Parts step', () => {
    it('lists bricks by colour, then plates', async () => {
        const user = await startMosaic();
        await goTo(user, 'Parts');
        expect(screen.getByText('BrickLink part 98138')).toBeInTheDocument();
        expect(screen.getByText('BrickLink part 41539')).toBeInTheDocument();
        expect(screen.getByText(/parts in \d+ lots/)).toBeInTheDocument();
    });

    it('adds the pins for plates that need them', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: '16 by 16 studs' }));
        await goTo(user, 'Parts');
        const table = screen.getByRole('table');
        expect(within(table).getByText(/Pin/)).toBeInTheDocument();
    });

    it('downloads and copies the BrickLink wanted list', async () => {
        const user = await startMosaic();
        await goTo(user, 'Parts');
        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        expect(downloads.at(-1)!.name).toBe('Mosaic Creator.xml');
        const xml = await lastDownloadText();
        expect(xml).toMatch(/^<INVENTORY>/);

        await user.click(screen.getByRole('button', { name: 'Copy XML' }));
        expect(await navigator.clipboard.readText()).toBe(xml);
        expect(screen.getByRole('link', { name: 'wanted list upload' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByRole('link', { name: 'wanted list upload' })).not.toBeInTheDocument();
    });

    it('names the file "mosaic" when the title is empty', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        await user.clear(screen.getByRole('textbox', { name: 'Title' }));
        await goTo(user, 'Parts');
        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        expect(downloads.at(-1)!.name).toBe('mosaic.xml');
    });
});
