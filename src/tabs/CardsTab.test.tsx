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

    it('changes the card colour', async () => {
        const user = await startMosaic();
        await goTo(user, 'Cards');
        fireEvent.input(screen.getByLabelText('Card colour'), { target: { value: '#112233' } });
        expect(screen.getByText(/#112233/)).toBeInTheDocument();
    });
});
