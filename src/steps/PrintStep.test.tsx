import { screen, within } from '@testing-library/react';
import type { User } from '../test/app';
import { renderStep } from '../test/step';
import PrintStep from './PrintStep';

const tools = () => within(screen.getByRole('complementary', { name: 'Tools' }));
const choose = (user: User, group: 'Paper' | 'Print', option: string | RegExp) =>
    user.click(within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name: option }));
const sheets = () => screen.getAllByRole('group', { name: /^Card / }).length;

describe('Print step', () => {
    it('prints the map page and the cards, chosen from one list', async () => {
        const { user } = await renderStep(PrintStep);
        const options = () =>
            within(screen.getByRole('radiogroup', { name: 'Print' }))
                .getAllByRole('radio')
                .map((r) => r.getAttribute('value') && r.closest('label')!.textContent);
        expect(options()).toEqual(['Map page', 'Cards, pages 1–2']);
        expect(screen.getByRole('radio', { name: 'Map page' })).toBeChecked();
        expect(screen.getByRole('list', { name: 'Colours used' })).toBeInTheDocument();
        expect(screen.queryAllByRole('group', { name: /^Card / })).toHaveLength(0);
        // printing ends the tools, under the settings it follows from, with what it'll print just above it
        expect(tools().getByText('The map page, on one sheet.')).toBeInTheDocument();
        // and nowhere else: not as an app-bar action
        const column = screen.getByRole('complementary', { name: 'Tools' });
        for (const button of screen.getAllByRole('button', { name: /^Print/ })) expect(column).toContainElement(button);
        await user.click(tools().getByRole('button', { name: 'Print map page' }));
        expect(window.print).toHaveBeenCalled();

        await choose(user, 'Print', 'Cards, pages 1–2');
        expect(screen.queryByRole('list', { name: 'Colours used' })).not.toBeInTheDocument();
        expect(sheets()).toBe(12);
        expect(tools().getByText('12 cards on 2 pages, 8 per A4 landscape page.')).toBeInTheDocument();
        expect(tools().getByRole('button', { name: 'Print cards' })).toBeInTheDocument();
    });

    it('prints on A3 or Letter paper, keeping the same list of pages', async () => {
        const { user, mosaic } = await renderStep(PrintStep);
        expect(
            within(screen.getByRole('radiogroup', { name: 'Paper' }))
                .getAllByRole('radio')
                .map((r) => r.getAttribute('value')),
        ).toEqual(['A4', 'A3', 'Letter']);
        expect(screen.getByRole('radio', { name: 'A4' })).toBeChecked();
        await choose(user, 'Print', /^Cards/);
        await choose(user, 'Paper', 'A3');
        expect(screen.getByText(/per A3 (landscape|portrait) page/)).toBeInTheDocument();
        expect(mosaic().project.card.paperSize).toBe('A3');
        // still the map page, then the cards, and still on the cards
        expect(screen.getAllByRole('radio', { name: /^(Map page|Cards)/ })).toHaveLength(2);
        expect(screen.getByRole('radio', { name: /^Cards/ })).toBeChecked();
        await choose(user, 'Paper', 'Letter');
        expect(screen.getByText(/per Letter landscape page/)).toBeInTheDocument();
    });

    it('splits big jobs into the map page and batches of cards', async () => {
        const { user } = await renderStep(PrintStep, { plateId: '395826', platesAcross: 40 });
        expect(screen.getByText(/Large jobs print in parts/)).toBeInTheDocument();
        const options = within(screen.getByRole('radiogroup', { name: 'Print' })).getAllByRole('radio');
        expect(options[0]).toHaveAccessibleName('Map page');
        expect(options[1]).toHaveAccessibleName('Cards, pages 1–20');
        expect(options[0]).toBeChecked();
        expect(screen.getByText(/Large jobs print in parts/)).toBeInTheDocument();

        await choose(user, 'Print', 'Cards, pages 21–40');
        expect(screen.queryByRole('list', { name: 'Colours used' })).not.toBeInTheDocument();
        expect(sheets()).toBeGreaterThan(0);
        expect(tools().getByRole('button', { name: 'Print cards' })).toBeInTheDocument();
    });

    it('prints big plates one to an A3 sheet, and says why', async () => {
        const { user } = await renderStep(PrintStep, { plateId: '6061048', platesAcross: 2 });
        await choose(user, 'Print', /^Cards/);
        expect(screen.getByText(/1 per A3 portrait page/)).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'A4' })).toBeChecked();
        expect(screen.getByText(/too big for A4, so they print on A3/)).toBeInTheDocument();
        // choosing A3 itself: no note
        await choose(user, 'Paper', 'A3');
        expect(screen.queryByText(/too big for/)).not.toBeInTheDocument();
    });
});
