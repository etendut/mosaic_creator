import { screen, waitFor, within } from '@testing-library/react';
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

        const spares = () => within(screen.getByRole('group', { name: 'Spares' }));
        await user.click(spares().getByRole('button', { name: '10%' }));
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

        await user.click(spares().getByRole('button', { name: 'Custom' }));
        const field = screen.getByRole('spinbutton', { name: 'Spares %' });
        await user.clear(field);
        await user.type(field, '25');
        expect(screen.getByText(/25% extra of each brick colour/)).toBeInTheDocument();
        await user.click(spares().getByRole('button', { name: 'None' }));
        expect(screen.getByText(/the list has exact counts/)).toBeInTheDocument();
        expect(quantities()).toEqual(exact);
    });

    it('rounds each brick colour and the pins up after the spares, but not the plates', async () => {
        const { user, mosaic } = await renderStep(PartsStep);
        const roundUp = within(screen.getByRole('group', { name: 'Round up' }));
        const exact = mosaic().parts;
        const isPlate = (partId: string) => partId === mosaic().plate.partId;
        expect(roundUp.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('You buy the exact count of each colour, plus any spares.')).toBeInTheDocument();

        await user.click(roundUp.getByRole('button', { name: '10' }));
        expect(mosaic().project.roundUp).toBe(10);
        expect(
            screen.getByText(
                'You buy each brick colour and the pins in 10s, after spares: 70 for a colour that needs 64. Plates stay exact.',
            ),
        ).toBeInTheDocument();
        mosaic().order.forEach((line, i) =>
            expect(line.quantity).toBe(
                isPlate(line.partId) ? exact[i].quantity : Math.ceil(exact[i].quantity / 10) * 10,
            ),
        );
        // what it adds shows as spares, in Info and on the lines
        expect(info('Spares')).toMatch(/^[\d,]+$/);
        // so with no spares, Spares no longer says the counts are exact
        expect(screen.getByText(/No spares beyond what Round up adds/)).toBeInTheDocument();

        // after the spares: 10% of each colour first, then up to the next 100
        await user.click(within(screen.getByRole('group', { name: 'Spares' })).getByRole('button', { name: '10%' }));
        await user.click(roundUp.getByRole('button', { name: '100' }));
        mosaic().order.forEach((line, i) => {
            const n = exact[i].quantity;
            if (!isPlate(line.partId)) expect(line.quantity).toBe(Math.ceil((n + Math.ceil(n / 10)) / 100) * 100);
        });

        await user.click(roundUp.getByRole('button', { name: 'Custom' }));
        const field = screen.getByRole('spinbutton', { name: 'Round up to' });
        await user.clear(field);
        await user.type(field, '25');
        expect(mosaic().project.roundUp).toBe(25);
        expect(screen.getByText(/in 25s, after spares: 75 for a colour that needs 64/)).toBeInTheDocument();
        // no more than 1,000
        await user.type(field, '000');
        expect(mosaic().project.roundUp).toBe(1000);

        await user.click(roundUp.getByRole('button', { name: 'None' }));
        expect(mosaic().project.roundUp).toBe(0);
        expect(screen.queryByRole('spinbutton', { name: 'Round up to' })).not.toBeInTheDocument();
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

    it('downloads the mosaic as a 3D model for BrickLink Studio, named after the mosaic, a model per card', async () => {
        const { user } = await renderStep((props) => <PartsStep {...props} name="Balloon" />);
        // with the other downloads, ending the tools
        const tools = within(screen.getByRole('complementary', { name: 'Tools' }));
        await user.click(tools.getByRole('button', { name: 'Download for Studio' }));
        expect(downloads.at(-1)!.name).toBe('Balloon.mpd');
        const mpd = await lastDownloadText();
        expect(mpd.startsWith('0 FILE mosaic.ldr\r\n0 Balloon\r\n')).toBe(true);
        // the test picture's mosaic: 4 × 3 cards
        expect(mpd.match(/^0 FILE card-[a-z]\d+\.ldr/gm)).toHaveLength(12);
    });

    it('downloads a big model, but warns that Studio will be slow with it', async () => {
        // 5 48 × 48 plates across: 240 × 150 bricks
        const { user } = await renderStep((props) => <PartsStep {...props} name="Balloon" />, {
            plateId: '4278193',
            platesAcross: 5,
        });
        await user.click(screen.getByRole('button', { name: 'Download for Studio' }));
        expect(downloads.at(-1)!.name).toBe('Balloon.mpd');
        // a warning, not an error: it waits until you close it
        const toast = screen.getByRole('status');
        expect(toast).toHaveTextContent(
            /^Balloon\.mpd has 3\d,\d{3} bricks, and Studio gets slow past about 30,000\. Use fewer plates across on the Bricks step for a lighter model\.$/,
        );
        await user.click(within(toast).getByRole('button', { name: 'Close' }));
        // (it slides away first)
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    });

    it('says nothing after downloading a model Studio handles easily', async () => {
        const { user } = await renderStep(PartsStep);
        await user.click(screen.getByRole('button', { name: 'Download for Studio' }));
        expect(downloads.at(-1)!.name).toMatch(/\.mpd$/);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('says why when a mosaic is too big for one model', async () => {
        // 40 48 × 48 baseplates across: millions of bricks
        const { user } = await renderStep(PartsStep, { plateId: '4278193', platesAcross: 40 });
        await user.click(screen.getByRole('button', { name: 'Download for Studio' }));
        expect(screen.getByRole('alert')).toHaveTextContent(/more than Studio can work with/);
        await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });

    it('names the BrickLink XML after the mosaic', async () => {
        const { user } = await renderStep((props) => <PartsStep {...props} name="Balloon" />);
        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        expect(downloads.at(-1)!.name).toBe('Balloon.xml');
    });

    it('names the file "mosaic" when the title is empty', async () => {
        const { user } = await renderStep(PartsStep, { card: { ...DEFAULT_PROJECT.card, title: '' } });
        await user.click(screen.getByRole('button', { name: 'Download BrickLink XML' }));
        expect(downloads.at(-1)!.name).toBe('mosaic.xml');
    });
});
