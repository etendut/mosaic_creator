import { screen, within } from '@testing-library/react';
import { DEFAULT_PROJECT } from '../mosaic/project';
import { goTo, info, infoLabels, startMosaic } from '../test/app';
import { renderStep } from '../test/step';
import PartsStep from './PartsStep';
import { downloads, lastDownloadText } from '../test/fakes';

describe('Parts step', () => {
    it('lists bricks by colour, then plates', async () => {
        await renderStep(PartsStep);
        expect(screen.getByText('BrickLink part 98138')).toBeInTheDocument();
        expect(screen.getByText('BrickLink part 41539')).toBeInTheDocument();
        expect(Number(info('Lots'))).toBeGreaterThan(0);
        // no spares: the Spares setting says so, and Info doesn't repeat it
        expect(infoLabels()).toEqual(['Parts', 'Lots']);
    });

    it('adds the pins for plates that need them', async () => {
        // black 16 × 16 plates, which are joined with pins
        await renderStep(PartsStep, { plateId: '6302092' });
        const table = screen.getByRole('table');
        expect(within(table).getByText(/Pin/)).toBeInTheDocument();
    });

    it('downloads and copies the BrickLink wanted list', async () => {
        const { user } = await renderStep(PartsStep);
        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        expect(downloads.at(-1)!.name).toBe('Mosaic Creator.xml');
        const xml = await lastDownloadText();
        expect(xml).toMatch(/^<INVENTORY>/);

        await user.click(screen.getByRole('button', { name: 'Copy XML' }));
        expect(await navigator.clipboard.readText()).toBe(xml);
        expect(screen.getByRole('link', { name: 'wanted list upload' })).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByRole('link', { name: 'wanted list upload' })).not.toBeInTheDocument();
    });

    it('adds spares to the parts list and wanted list, but not to the cards', async () => {
        const user = await startMosaic();
        const number = (text: string | null) => Number(text!.match(/^[\d,]+/)![0].replace(/,/g, ''));
        const quantities = () =>
            within(screen.getByRole('table'))
                .getAllByRole('row')
                .slice(1)
                .map((row) => number(within(row).getAllByRole('cell')[1].textContent));
        const legend = async () => {
            await goTo(user, 'Print');
            const text = screen.getByRole('list', { name: 'Colours used' }).textContent;
            await goTo(user, 'Parts');
            return text;
        };
        const exactLegend = await legend();
        const exact = quantities();
        expect(infoLabels()).not.toContain('Spares');

        await user.click(screen.getByRole('button', { name: '10%' }));
        // how many extra: a number the setting doesn't show
        expect(info('Spares')).toMatch(/^[\d,]+$/);
        expect(screen.getByText(/10% extra of each brick colour/)).toBeInTheDocument();
        // the plates (their part row and colour row) stay exact; every other row grows by at least 10%
        const grown = quantities();
        expect(grown.filter((n, i) => n === exact[i])).toHaveLength(2);
        grown.forEach((n, i) => n !== exact[i] && expect(n).toBeGreaterThanOrEqual(Math.ceil((exact[i] * 11) / 10)));
        expect(screen.getAllByText(/incl\. \d+ spares?/).length).toBeGreaterThan(0);

        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        const xml = await lastDownloadText();
        const xmlTotal = [...xml.matchAll(/<MINQTY>(\d+)/g)].reduce((t, m) => t + Number(m[1]), 0);
        expect(xmlTotal).toBe(number(info('Parts')));

        // the cards and the map page keep exact counts
        expect(await legend()).toBe(exactLegend);

        await user.click(screen.getByRole('button', { name: 'Custom' }));
        const field = screen.getByRole('spinbutton', { name: 'Spares %' });
        await user.clear(field);
        await user.type(field, '25');
        expect(screen.getByText(/25% extra of each brick colour/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'None' }));
        expect(screen.getByText(/the list has exact counts/)).toBeInTheDocument();
        expect(quantities()).toEqual(exact);
    });

    it('ends the tools with Download and Copy XML, like Print', async () => {
        await renderStep(PartsStep);
        const tools = within(screen.getByRole('complementary', { name: 'Tools' }));
        expect(tools.getByRole('button', { name: 'Download BrickLink XML' })).toBeInTheDocument();
        expect(tools.getByRole('button', { name: 'Copy XML' })).toBeInTheDocument();
        // and nowhere else: not as an app-bar action
        const column = screen.getByRole('complementary', { name: 'Tools' });
        for (const button of screen.getAllByRole('button', { name: /XML/ })) expect(column).toContainElement(button);
    });

    it('names the file "mosaic" when the title is empty', async () => {
        const { user } = await renderStep(PartsStep, { card: { ...DEFAULT_PROJECT.card, title: '' } });
        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        expect(downloads.at(-1)!.name).toBe('mosaic.xml');
    });
});
