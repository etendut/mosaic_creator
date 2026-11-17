import { fireEvent, screen } from '@testing-library/react';
import { goTo, info, startMosaic } from '../test/app';

describe('Cards step', () => {
    it('previews the first card with the card text', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        expect(screen.getByRole('group', { name: 'Card A1' })).toBeInTheDocument();

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
        expect(screen.getByText(/printed at real size/)).toBeVisible();
        expect(info('Per page')).toBe('8 on A4 landscape');
        expect(info('Brick on the card')).toBe('8.0 mm');

        await user.click(screen.getByRole('button', { name: 'Compact' }));
        expect(screen.getByRole('button', { name: 'Compact' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/Smaller grids and text/)).toBeVisible();
        expect(info('Per page')).toBe('10 on A4 landscape');
    });

    it('adds a bag list to each card, showing what it costs in cards per page', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        expect(screen.queryByRole('list', { name: 'Bricks for card A1' })).not.toBeInTheDocument();
        expect(info('Per page')).toBe('8 on A4 landscape');

        await user.click(screen.getByRole('checkbox', { name: 'Bag list' }));
        const bag = screen.getByRole('list', { name: 'Bricks for card A1' });
        expect(bag.children.length).toBeGreaterThan(0);
        // the bag list takes room on each card, so fewer fit a page
        expect(info('Per page')).not.toBe('8 on A4 landscape');
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
        expect(screen.getByRole('group', { name: 'Card A1' })).toHaveStyle({ backgroundColor: '#112233' });
    });
});
