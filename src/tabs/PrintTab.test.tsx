import { screen } from '@testing-library/react';
import { DEFAULT_PROJECT } from '../mosaic/project';
import { goTo, startMosaic } from '../test/app';

const remember = (settings: object) =>
    localStorage.setItem('mosaic-creator:settings', JSON.stringify({ ...DEFAULT_PROJECT, ...settings }));

describe('Print step', () => {
    it('prints a map page, then the cards', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByText(/8 per A4 landscape page, after a map page/)).toBeInTheDocument();
        expect(screen.getByRole('list', { name: 'Colours used' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Print cards' }));
        expect(window.print).toHaveBeenCalled();
    });

    it('leaves the map page out when asked', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        await user.click(screen.getByRole('checkbox', { name: 'Map page' }));
        expect(screen.queryByText(/after a map page/)).not.toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Colours used' })).not.toBeInTheDocument();
    });

    it('prints on Letter paper', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        await user.click(screen.getByRole('combobox', { name: 'Paper' }));
        await user.click(screen.getByRole('option', { name: 'Letter' }));
        expect(screen.getByText(/per Letter landscape page/)).toBeInTheDocument();
    });

    it('splits big jobs into batches of pages', async () => {
        remember({ plateId: '395826', platesAcross: 40 });
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByText(/Large jobs print in batches/)).toBeInTheDocument();
        await user.click(screen.getByRole('combobox', { name: 'Pages' }));
        await user.click(screen.getByRole('option', { name: '21-40' }));
        expect(screen.getByRole('combobox', { name: 'Pages' })).toHaveTextContent('21-40');
        // the map page is only in the first batch
        expect(screen.queryByRole('list', { name: 'Colours used' })).not.toBeInTheDocument();
    });

    it('prints big plates one to an A3 sheet, with no paper choice', async () => {
        remember({ plateId: '6061048', platesAcross: 2 });
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByText(/1 per A3 portrait page/)).toBeInTheDocument();
        expect(screen.queryByRole('combobox', { name: 'Paper' })).not.toBeInTheDocument();
    });
});
