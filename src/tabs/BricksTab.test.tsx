import { screen, within } from '@testing-library/react';
import { startMosaic } from '../test/app';
import { downloads, lastDownloadText } from '../test/fakes';

const palette = () => screen.getByRole('heading', { name: 'Colours' }).parentElement!;
const plates = () => screen.getByRole('heading', { name: 'Backing plate' }).parentElement!;
const colorsOn = () =>
    Number(
        within(palette())
            .getByText(/colours on/)
            .textContent!.split(' ')[0],
    );

describe('Bricks step', () => {
    it('changes the plate size, keeping its colour when that size comes in it', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: '16 by 16 studs' }));
        expect(screen.getByRole('button', { name: /Black.*joined with 4 pins/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        // no black 32×32, so the first 32×32 plate instead
        await user.click(screen.getByRole('button', { name: '32 by 32 studs' }));
        expect(within(plates()).getByRole('button', { name: /Light Bluish Gray/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        await user.click(within(plates()).getByRole('button', { name: /White/ }));
        expect(within(plates()).getByRole('button', { name: /White/ })).toHaveAttribute('aria-pressed', 'true');
    });

    it('changes the brick', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Brick 1×1' }));
        expect(screen.getByRole('button', { name: 'Brick 1×1' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Tile round 1×1' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('sets the size from the box or the slider, within limits', async () => {
        const user = await startMosaic();
        const box = screen.getByRole('spinbutton', { name: 'Plates across' });
        await user.clear(box);
        await user.type(box, '6');
        expect(screen.getByText(/6 plates across/)).toBeInTheDocument();
        await user.clear(box);
        await user.type(box, '99');
        expect(screen.getByText(/40 plates across/)).toBeInTheDocument();
        await user.clear(box);
        expect(screen.getByText(/1 plates across/)).toBeInTheDocument();

        screen.getByRole('slider', { name: 'Plates across slider' }).focus();
        await user.keyboard('{ArrowRight}');
        expect(screen.getByText(/2 plates across/)).toBeInTheDocument();
    });

    it('switches colour sets and turns single colours on and off', async () => {
        const user = await startMosaic();
        const solid = colorsOn();
        await user.click(screen.getByRole('button', { name: 'All colours' }));
        expect(colorsOn()).toBeGreaterThan(solid);
        await user.click(screen.getByRole('button', { name: 'Greyscale' }));
        expect(colorsOn()).toBeLessThan(solid);

        await user.click(screen.getByRole('button', { name: 'White (on)' }));
        expect(screen.getByRole('button', { name: 'White (off)' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Custom' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'White (off)' }));
        expect(screen.getByRole('button', { name: 'White (on)' })).toBeInTheDocument();
    });

    it('shows colour names on request, for touch screens', async () => {
        const user = await startMosaic();
        expect(within(palette()).queryByText('1 White')).not.toBeInTheDocument();
        await user.click(screen.getByRole('switch', { name: 'Names' }));
        expect(within(palette()).getByText('1 White')).toBeInTheDocument();
    });

    it('limits the number of colours and changes how they are matched', async () => {
        const user = await startMosaic();
        const max = screen.getByRole('spinbutton', { name: 'Max colours' });
        await user.type(max, '2');
        expect(screen.getByText(/^2 colours used/)).toBeInTheDocument();
        await user.clear(max);
        expect(max).toHaveValue(null);

        await user.click(screen.getByRole('combobox', { name: 'Colour matching' }));
        await user.click(screen.getByRole('option', { name: 'Perceptual' }));
        expect(screen.getByRole('combobox', { name: 'Colour matching' })).toHaveTextContent('Perceptual');
    });

    it('saves the palette with colour names', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Save palette' }));
        expect(downloads.at(-1)!.name).toBe('Mosaic Creator.palette.json');
        const file = JSON.parse(await lastDownloadText());
        expect(file.brick).toBe('98138');
        expect(file.colors).toContainEqual({ id: 1, name: 'White', hex: expect.any(String) });
        expect(file.colorIds).toContain(1);
    });

    it('loads a palette, naming the colours the brick does not come in', async () => {
        const user = await startMosaic();
        const json = JSON.stringify({ name: 'Club', colors: [{ id: 1 }, { name: 'black' }, { name: 'Unobtainium' }] });
        await user.upload(screen.getByTestId('palette-file'), new File([json], 'club.palette.json'));
        expect(await screen.findByText(/Loaded "Club"\. Unobtainium doesn't come in/)).toBeInTheDocument();
        expect(colorsOn()).toBe(2);

        const two = JSON.stringify({ name: 'Two', colorIds: [1, 98765, 98766] });
        await user.upload(screen.getByTestId('palette-file'), new File([two], 'two.palette.json'));
        expect(await screen.findByText(/colour 98765 and colour 98766 don't come in/)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText(/Loaded "Two"/)).not.toBeInTheDocument();

        await user.upload(screen.getByTestId('palette-file'), new File(['{"colorIds":[1]}'], 'p.json'));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('refuses files that are not palettes, or have no usable colours', async () => {
        const user = await startMosaic();
        await user.upload(screen.getByTestId('palette-file'), new File(['{"hello":1}'], 'x.json'));
        expect(await screen.findByText('Not a palette file')).toBeInTheDocument();
        await user.upload(
            screen.getByTestId('palette-file'),
            new File(['{"name":"Odd","colorIds":[98765]}'], 'y.json'),
        );
        expect(await screen.findByText(/None of the colours in "Odd" come in/)).toBeInTheDocument();
    });

    it('swaps a used colour for another, and undoes it', async () => {
        const user = await startMosaic();
        const used = screen.getByText(/colours used/).parentElement!;
        const [first] = within(used).getAllByRole('button');
        const fromName = first.getAttribute('aria-label')!.split(':')[0];
        await user.click(first);
        const menu = screen.getByRole('menu');
        expect(within(menu).getByText(`Use instead of ${fromName}`)).toBeInTheDocument();
        await user.click(within(menu).getByRole('menuitem', { name: /Magenta/ }));
        const chip = screen.getByRole('button', { name: `${fromName} → Magenta` });
        await user.click(within(chip).getByTestId('CancelIcon'));
        expect(screen.queryByRole('button', { name: `${fromName} → Magenta` })).not.toBeInTheDocument();

        await user.click(within(used).getAllByRole('button')[0]);
        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('prints the map', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Print map' }));
        expect(window.print).toHaveBeenCalled();
        // the printed page, hidden on screen
        expect(screen.getByRole('list', { name: 'Colours used', hidden: true })).toBeInTheDocument();
    });
});
