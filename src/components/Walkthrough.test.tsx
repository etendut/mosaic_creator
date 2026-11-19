import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { chooseImage, goTo, info, renderApp, startMosaic, type User } from '../test/app';

/** The sample picture, inlined as an SVG data URL so the single-file build needs no other file. */
const SAMPLE = /^data:image\/svg\+xml/;
const card = (n?: number) => screen.findByRole('dialog', { name: n ? new RegExp(`^${n} of 7`) : /of 7/ });
const offer = () => screen.queryByRole('button', { name: 'Show me around' });
const step = () => screen.getByRole('tab', { selected: true }).getAttribute('aria-label');
const press = async (user: User, name: string, n: number) =>
    user.click(within(await card(n)).getByRole('button', { name }));
const fromMenu = async (user: User) => {
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /Show me around/ }));
};
const ended = () => waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
const seen = () => localStorage.getItem('mosaic-creator:walkthrough-seen');
/** The picture on the Image step, from the cropper's preview. */
const picture = () => screen.getByTestId('cropper').getAttribute('src') ?? '';

const STOPS = [
    ['Image', 'use-image', 'Drag and zoom to frame your picture, then use it.'],
    ['Bricks', 'group-plate', "Choose the plate and brick you'll build with."],
    ['Bricks', 'info-bar', 'These numbers follow your choices'],
    ['Touch up', 'group-paint', 'Paint single bricks to sharpen faces and edges.'],
    ['Cards', 'group-size', 'Each card is one plate.'],
    ['Parts', 'download-xml', 'Download the parts as a BrickLink wanted list.'],
    ['Print', 'print-action', 'Print the map page for yourself and one card for each builder.'],
] as const;

describe('Walkthrough', () => {
    it('starts from the empty state with the sample picture, at the first stop', async () => {
        const user = renderApp();
        await user.click(offer()!);
        const stop = await card(1);
        expect(stop).toHaveTextContent(STOPS[0][2]);
        expect(picture()).toMatch(SAMPLE);
        expect(step()).toBe('Image');
        // the first stop has no Back; focus is on Next
        expect(within(stop).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
        await waitFor(() => expect(within(stop).getByRole('button', { name: 'Next' })).toHaveFocus());
    });

    it('goes through all seven stops in step order, switching step itself, and ends on Done', async () => {
        const user = renderApp();
        await user.click(offer()!);
        for (const [i, [name, target, text]] of STOPS.entries()) {
            const stop = await card(i + 1);
            expect(stop).toHaveTextContent(text);
            await waitFor(() => expect(step()).toBe(name));
            // what the stop points at is on this step
            expect(document.querySelector(`[data-tour="${target}"]`)).toBeInTheDocument();
            const last = i === STOPS.length - 1;
            // the last stop has Done and no Skip
            expect(within(stop).queryByRole('button', { name: 'Skip' }) === null).toBe(last);
            await press(user, last ? 'Done' : 'Next', i + 1);
        }
        await ended();
        expect(seen()).toBe('yes');
    });

    it('goes back a stop, and its step, with Back', async () => {
        const user = renderApp();
        await user.click(offer()!);
        await press(user, 'Next', 1);
        await press(user, 'Next', 2);
        await press(user, 'Next', 3);
        await card(4);
        await waitFor(() => expect(step()).toBe('Touch up'));
        await press(user, 'Back', 4);
        expect(await card(3)).toHaveTextContent(STOPS[2][2]);
        await waitFor(() => expect(step()).toBe('Bricks'));
    });

    it('ends on Skip, remembered, so the empty state stops offering it, even on the next visit', async () => {
        const user = renderApp();
        await user.click(offer()!);
        await press(user, 'Next', 1);
        await press(user, 'Skip', 2);
        await ended();
        expect(seen()).toBe('yes');

        cleanup();
        render(<App />, { wrapper: AppProviders });
        expect(screen.getByText('Start with a picture')).toBeInTheDocument();
        expect(offer()).not.toBeInTheDocument();
    });

    it('ends on Esc, which counts as seen, and focus goes back to ☰', async () => {
        const user = await startMosaic();
        await fromMenu(user);
        await card(1);
        await user.keyboard('{Escape}');
        await ended();
        expect(seen()).toBe('yes');
        expect(screen.getByRole('button', { name: 'Menu' })).toHaveFocus();
    });

    it('is always in ☰, even once seen', async () => {
        localStorage.setItem('mosaic-creator:walkthrough-seen', 'yes');
        const user = renderApp();
        expect(offer()).not.toBeInTheDocument();
        await fromMenu(user);
        expect(await card(1)).toBeInTheDocument();
    });

    it("never replaces a picture you've picked with the sample", async () => {
        const user = renderApp();
        await chooseImage(user, 'mine.png');
        const mine = picture();
        expect(mine).not.toMatch(SAMPLE);
        await fromMenu(user);
        await card(1);
        expect(picture()).toBe(mine);
    });

    it("doesn't load the sample over a mosaic you already have", async () => {
        const user = await startMosaic();
        const before = info('Mosaic');
        await fromMenu(user);
        await card(1);
        expect(picture()).not.toMatch(SAMPLE);
        // the mosaic is the same one, once the tour is over
        await user.keyboard('{Escape}');
        await goTo(user, 'Bricks');
        expect(info('Mosaic')).toBe(before);
    });
});
