import { screen, within } from '@testing-library/react';
import { DEFAULT_PROJECT } from '../mosaic/project';
import { goTo, startMosaic, type User } from '../test/app';

const remember = (settings: object) =>
    localStorage.setItem('mosaic-creator:settings', JSON.stringify({ ...DEFAULT_PROJECT, ...settings }));

const tools = () => within(screen.getByRole('complementary', { name: 'Tools' }));
const choose = (user: User, group: 'Paper' | 'Print', option: string | RegExp) =>
    user.click(within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name: option }));
const sheets = () => screen.getAllByRole('group', { name: /^Card / }).length;

describe('Print step', () => {
    it('prints the map page, then the cards', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByRole('radio', { name: 'Map and cards' })).toBeChecked();
        expect(screen.getByRole('list', { name: 'Colours used' })).toBeInTheDocument();
        // printing ends the tools, under the settings it follows from, with what it'll print just above it
        expect(tools().getByText('A map page, then 12 cards on 2 pages, 8 per A4 landscape page.')).toBeInTheDocument();
        expect(within(screen.getByRole('banner')).queryByRole('button', { name: /Print/ })).not.toBeInTheDocument();
        await user.click(tools().getByRole('button', { name: 'Print map and cards' }));
        expect(window.print).toHaveBeenCalled();
    });

    it('prints the map page or the cards on their own', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        await choose(user, 'Print', 'Map page only');
        expect(screen.getByRole('list', { name: 'Colours used' })).toBeInTheDocument();
        expect(screen.queryAllByRole('group', { name: /^Card / })).toHaveLength(0);
        expect(tools().getByText('The map page, on one sheet.')).toBeInTheDocument();
        expect(tools().getByRole('button', { name: 'Print map page' })).toBeInTheDocument();

        await choose(user, 'Print', 'Cards only');
        expect(screen.queryByRole('list', { name: 'Colours used' })).not.toBeInTheDocument();
        expect(sheets()).toBe(12);
        expect(tools().getByRole('button', { name: 'Print cards' })).toBeInTheDocument();
    });

    it('prints on Letter or A3 paper', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByRole('radio', { name: 'A4' })).toBeChecked();
        await choose(user, 'Paper', 'Letter');
        expect(screen.getByText(/per Letter landscape page/)).toBeInTheDocument();
        await choose(user, 'Paper', 'A3');
        expect(screen.getByText(/per A3 (landscape|portrait) page/)).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('mosaic-creator:settings')!).card.paperSize).toBe('A3');
    });

    it('splits big jobs into the map page and batches of cards', async () => {
        remember({ plateId: '395826', platesAcross: 40 });
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByText(/Large jobs print in parts/)).toBeInTheDocument();
        const options = within(screen.getByRole('radiogroup', { name: 'Print' })).getAllByRole('radio');
        expect(options[0]).toHaveAccessibleName('Map page');
        expect(options[1]).toHaveAccessibleName('Cards, pages 1–20');
        expect(options[0]).toBeChecked();

        await choose(user, 'Print', 'Cards, pages 21–40');
        expect(screen.queryByRole('list', { name: 'Colours used' })).not.toBeInTheDocument();
        expect(sheets()).toBeGreaterThan(0);
        expect(tools().getByRole('button', { name: 'Print cards' })).toBeInTheDocument();
    });

    it('prints big plates one to an A3 sheet, and says why', async () => {
        remember({ plateId: '6061048', platesAcross: 2 });
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByText(/1 per A3 portrait page/)).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'A4' })).toBeChecked();
        expect(screen.getByText(/too big for A4, so they print on A3/)).toBeInTheDocument();
        // choosing A3 itself: no note
        await choose(user, 'Paper', 'A3');
        expect(screen.queryByText(/too big for/)).not.toBeInTheDocument();
    });
});
