import { fireEvent, screen } from '@testing-library/react';
import { goTo, startMosaic } from '../test/app';

describe('Cards step', () => {
    it('previews the first card with the card text', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        expect(screen.getByText(/Card A1 as it prints/)).toBeInTheDocument();

        // pasted rather than typed: each keystroke redraws the card, which is slow under coverage
        const title = screen.getByRole('textbox', { name: 'Title' });
        await user.clear(title);
        await user.click(title);
        await user.paste('Library Day');
        expect(screen.getAllByText('Library Day').length).toBeGreaterThan(0);

        await user.click(screen.getByRole('textbox', { name: 'Club or event' }));
        await user.paste(' 2026');
        expect(screen.getByText('Our Brick Club 2026')).toBeInTheDocument();
    });

    it('switches between real size and compact cards', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        expect(
            screen.getByText(/size of the real brick.*8 cards per page on A4 landscape, 8\.0 mm per brick/),
        ).toBeVisible();

        await user.click(screen.getByRole('button', { name: 'Compact' }));
        expect(screen.getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/Smaller grids and text.*10 cards per page/)).toBeVisible();
        expect(screen.getByText(/print 10 to a page/)).toBeInTheDocument();
    });

    it('adds a bag list to each card, showing what it costs in cards per page', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        expect(screen.queryByRole('list', { name: 'Bricks for card A1' })).not.toBeInTheDocument();
        expect(screen.getByText(/With it: \d+ cards per page/)).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'Bag list' }));
        const bag = screen.getByRole('list', { name: 'Bricks for card A1' });
        expect(bag.children.length).toBeGreaterThan(0);
        expect(screen.getByText(/Without it: 8 cards per page/)).toBeInTheDocument();
    });

    it('warns when instructions are too long for the card', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        expect(screen.queryByText(/longer than the card has room for/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('textbox', { name: 'Instructions above the grid' }));
        await user.paste(' and then some more words'.repeat(8));
        expect(screen.getByText(/longer than the card has room for/)).toBeInTheDocument();
    });

    it('changes the card colour', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        fireEvent.input(screen.getByLabelText('Card colour'), { target: { value: '#112233' } });
        expect(screen.getByText(/#112233/)).toBeInTheDocument();
    });
});
