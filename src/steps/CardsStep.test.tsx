import { screen, within } from '@testing-library/react';
import { info } from '../test/app';
import { renderStep } from '../test/step';
import CardsStep from './CardsStep';

describe('Cards step', () => {
    it('shows the card with the fewest colours and the one with the most, with the card text', async () => {
        const { user } = await renderStep(CardsStep);
        const captions = screen.getAllByText(/^(Fewest|Most) colours: card /);
        expect(captions.map((c) => c.textContent?.split(':')[0])).toEqual(['Fewest colours', 'Most colours']);
        const cards = screen.getAllByRole('group', { name: /^Card / });
        expect(cards).toHaveLength(2);
        // each caption names its card, and the busiest card's bag list is the longest
        const lists = cards.map((card) => within(card).getByRole('list', { name: /^Bricks for card / }));
        expect(lists[1].children.length).toBeGreaterThan(lists[0].children.length);

        // pasted rather than typed: each keystroke redraws the cards, which is slow under coverage
        const title = screen.getByRole('textbox', { name: 'Title' });
        await user.clear(title);
        await user.click(title);
        await user.paste('Library Day');
        expect(screen.getAllByText('Library Day')).toHaveLength(2);

        await user.click(screen.getByRole('textbox', { name: 'Club or event' }));
        await user.paste(' 2026');
        expect(screen.getAllByText('Our Brick Club 2026')).toHaveLength(2);
    });

    it('prints bricks at real size, on white cards, with a bag list on every card', async () => {
        await renderStep(CardsStep);
        expect(info('Brick on the card')).toBe('8.0 mm');
        expect(info('Per page')).toBe('4 on A4 portrait');
        // no card size, colour or bag list settings left to change
        for (const name of ['Real size', 'Compact']) expect(screen.queryByRole('button', { name })).toBeNull();
        expect(screen.queryByLabelText('Card colour')).toBeNull();
        expect(screen.queryByRole('checkbox', { name: 'Bag list' })).toBeNull();
        for (const card of screen.getAllByRole('group', { name: /^Card / })) {
            expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
            expect(within(card).getByRole('list', { name: /^Bricks for card / }).children.length).toBeGreaterThan(0);
        }
    });

    it('warns when instructions are too long for the card', async () => {
        const { user } = await renderStep(CardsStep);
        expect(screen.queryByText(/longer than the card has room for/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('textbox', { name: 'Instructions above the grid' }));
        await user.paste(' and then some more words'.repeat(8));
        expect(screen.getByText(/longer than the card has room for/)).toBeInTheDocument();
    });
});
