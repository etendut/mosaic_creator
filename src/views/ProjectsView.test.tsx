import { act, render, screen, within } from '@testing-library/react';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { goTo, info, startMosaic } from '../test/app';

/** The Mosaics link in Mosaic's app bar: the word on desktop (the icon alone on a phone is hidden there). */
const mosaicsLink = () => screen.getAllByRole('link', { name: /Mosaics/ })[0];
const cards = () => within(screen.getByRole('list', { name: 'Mosaics' })).getAllByRole('listitem');
const card = (name: string) => screen.getByRole('listitem', { name });

describe('Mosaics view (prototype: a mock library)', () => {
    it('goes from a mosaic to Mosaics and back to the open project with the link and the back button', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        await user.click(mosaicsLink());

        expect(window.location.hash).toBe('#/mosaics');
        expect(screen.getByRole('heading', { name: 'Mosaics', level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Bricks' })).not.toBeInTheDocument();
        expect(info('Mosaics')).toBe('6');

        act(() => window.history.back());
        expect(await screen.findByRole('heading', { name: 'Cards', level: 1 })).toBeInTheDocument();
    });

    it('lists the open project first and marks it current', async () => {
        const user = await startMosaic();
        await user.click(mosaicsLink());
        expect(cards()[0]).toHaveAccessibleName('Balloon');
        expect(cards()[0]).toHaveAttribute('aria-current', 'true');
        expect(card('Fox')).not.toHaveAttribute('aria-current');
    });

    it('opens a project from its card on Bricks, with its name in the app bar', async () => {
        const user = await startMosaic();
        await user.click(mosaicsLink());
        await user.click(within(card('Fox')).getByRole('link'));

        expect(await screen.findByRole('heading', { name: 'Bricks', level: 1 })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/h8w1/bricks');
        expect(screen.getByRole('button', { name: 'Fox, rename' })).toBeInTheDocument();
    });

    it('sorts by name, keeping the open project first', async () => {
        const user = await startMosaic();
        await user.click(mosaicsLink());
        await user.click(screen.getAllByRole('button', { name: 'Name' })[0]);
        expect(cards().map((c) => c.getAttribute('aria-label'))).toEqual([
            'Balloon',
            'Club logo',
            'Fox',
            'Grandad',
            'Library Day banner',
            'Sunset over the harbour at Fremantle',
        ]);
    });

    it('duplicates a project next to it, and deletes one with Undo', async () => {
        const user = await startMosaic();
        await user.click(mosaicsLink());
        await user.click(screen.getByRole('button', { name: 'Duplicate Fox' }));
        expect(card('Fox (2)')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Delete Grandad' }));
        expect(screen.queryByRole('listitem', { name: 'Grandad' })).not.toBeInTheDocument();
        await user.click(await screen.findByRole('button', { name: 'Undo' }));
        expect(card('Grandad')).toBeInTheDocument();
    });

    it('starts a new mosaic on Image, named New mosaic', async () => {
        const user = await startMosaic();
        await user.click(mosaicsLink());
        await user.click(screen.getAllByRole('button', { name: 'New mosaic' })[0]);
        expect(await screen.findByRole('heading', { name: 'Image', level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'New mosaic, rename' })).toBeInTheDocument();
    });

    it('renames the open project from the app bar: Enter saves, Esc cancels', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Balloon, rename' }));
        await user.clear(screen.getByRole('textbox', { name: 'Project name' }));
        await user.type(screen.getByRole('textbox', { name: 'Project name' }), 'Red balloon{Enter}');
        expect(screen.getByRole('button', { name: 'Red balloon, rename' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Red balloon, rename' }));
        await user.type(screen.getByRole('textbox', { name: 'Project name' }), 'Nope{Escape}');
        expect(screen.getByRole('button', { name: 'Red balloon, rename' })).toBeInTheDocument();

        await user.click(mosaicsLink());
        expect(card('Red balloon')).toBeInTheDocument();
    });

    it('opens on Mosaics from its URL', () => {
        window.history.replaceState(null, '', '#/mosaics');
        render(<App />, { wrapper: AppProviders });
        expect(screen.getByRole('heading', { name: 'Mosaics', level: 1 })).toBeInTheDocument();
    });
});
