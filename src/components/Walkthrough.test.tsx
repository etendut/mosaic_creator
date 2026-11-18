import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { chooseImage, goTo, info, renderApp, startMosaic, type User } from '../test/app';

/** The sample picture, inlined as an SVG data URL so the single-file build needs no other file. */
const SAMPLE = /^data:image\/svg\+xml/;
const card = () => screen.findByRole('dialog', { name: /of \d/ });
const offer = () => screen.queryByRole('button', { name: 'Show me around' });
const fromMenu = async (user: User) => {
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Show me around/ }));
};
/** The picture on the Image step, from the cropper's preview. */
const picture = () => screen.getByTestId('cropper').getAttribute('src') ?? '';

describe('Walkthrough', () => {
    it('starts from the empty state with the sample picture, at the first stop', async () => {
        const user = renderApp();
        await user.click(offer()!);
        const stop = await card();
        expect(stop).toHaveTextContent('1 of 1');
        expect(stop).toHaveTextContent('Drag and zoom to frame your picture, then use it.');
        expect(picture()).toMatch(SAMPLE);
        // the stop points at Use this image, and focus is on the card's button
        expect(screen.getByRole('button', { name: 'Use this image' })).toHaveAttribute('data-tour', 'use-image');
        await waitFor(() => expect(within(stop).getByRole('button', { name: 'Done' })).toHaveFocus());
    });

    it('ends on Done, and the empty state stops offering it, even on the next visit', async () => {
        const user = renderApp();
        await user.click(offer()!);
        await user.click(within(await card()).getByRole('button', { name: 'Done' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(localStorage.getItem('mosaic-creator:walkthrough-seen')).toBe('yes');

        cleanup();
        render(<App />, { wrapper: AppProviders });
        expect(screen.getByText('Start with a picture')).toBeInTheDocument();
        expect(offer()).not.toBeInTheDocument();
    });

    it('ends on Esc, which counts as seen, and focus goes back to ☰', async () => {
        const user = await startMosaic();
        await fromMenu(user);
        await card();
        await user.keyboard('{Escape}');
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(localStorage.getItem('mosaic-creator:walkthrough-seen')).toBe('yes');
        expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    });

    it('is always in ☰, even once seen', async () => {
        localStorage.setItem('mosaic-creator:walkthrough-seen', 'yes');
        const user = renderApp();
        expect(offer()).not.toBeInTheDocument();
        await fromMenu(user);
        expect(await card()).toHaveTextContent('1 of 1');
    });

    it("never replaces a picture you've picked with the sample", async () => {
        const user = renderApp();
        await chooseImage(user, 'mine.png');
        const mine = picture();
        expect(mine).not.toMatch(SAMPLE);
        await fromMenu(user);
        await card();
        expect(picture()).toBe(mine);
    });

    it("doesn't load the sample over a mosaic you already have", async () => {
        const user = await startMosaic();
        const before = info('Mosaic');
        await fromMenu(user);
        await card();
        expect(picture()).not.toMatch(SAMPLE);
        // the mosaic is the same one, once the tour is over
        await user.keyboard('{Escape}');
        await goTo(user, 'Bricks');
        expect(info('Mosaic')).toBe(before);
    });
});
