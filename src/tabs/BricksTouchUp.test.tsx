import { fireEvent, screen, within } from '@testing-library/react';
import { startMosaic, type User } from '../test/app';

/**
 * The map canvas, laid out so each brick is 10 px square on screen (jsdom does no layout), and a way to press, move
 * and release the pointer over a brick by its column and row.
 */
const map = () => {
    const [, width, height] = screen.getAllByText(/^\d+ × \d+ bricks$/)[0].textContent!.match(/(\d+) × (\d+)/)!;
    const canvas = screen.getByLabelText(/^Card map/);
    canvas.getBoundingClientRect = () =>
        ({ left: 0, top: 0, width: Number(width) * 10, height: Number(height) * 10 }) as DOMRect;
    const at = (x: number, y: number) => ({ clientX: x * 10 + 5, clientY: y * 10 + 5, pointerId: 1 });
    return {
        down: (x: number, y: number) => fireEvent.pointerDown(canvas, at(x, y)),
        move: (x: number, y: number, pointerType = 'touch') =>
            fireEvent.pointerMove(canvas, { ...at(x, y), pointerType }),
        up: () => fireEvent.pointerUp(canvas),
        click(x: number, y: number) {
            this.down(x, y);
            this.up();
        },
    };
};

const toolbar = () => within(screen.getByRole('toolbar', { name: 'Touch up' }));
const tool = (name: string | RegExp) => toolbar().getByRole('button', { name });
const touchedUp = (n: number) => screen.getByText(new RegExp(`\\b${n} bricks? touched up\\.`));
const noneTouchedUp = () => expect(screen.queryByText(/touched up/)).not.toBeInTheDocument();

const paintWith = async (user: User, name: string) => {
    if (tool('Brush').getAttribute('aria-pressed') !== 'true') await user.click(tool('Brush'));
    await user.click(tool(/^Paint colour/));
    await user.click(within(screen.getByRole('menu')).getByText(name));
};

const brush = async (user: User, size: number, shape: 'Round' | 'Square') => {
    await user.click(toolbar().getByRole('combobox', { name: 'Brush size' }));
    await user.click(screen.getByRole('option', { name: `${size} × ${size}` }));
    await user.click(tool(`${shape} brush`));
};

describe('Touch-up toolbar', () => {
    it('paints single bricks, drags to paint several, and undoes a drag in one step', async () => {
        const user = await startMosaic();
        const m = map();
        // viewing: clicks do nothing
        expect(tool('View')).toHaveAttribute('aria-pressed', 'true');
        m.click(4, 4);
        noneTouchedUp();

        await paintWith(user, 'Black');
        expect(tool('Brush')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/make bricks Black/)).toBeInTheDocument();
        m.click(4, 4);
        expect(touchedUp(1)).toBeInTheDocument();
        // the colours used, and so the cards and parts, follow the painted brick
        expect(screen.getByTitle('Black: 1')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('mosaic-creator:settings')!).touchUps.edits).toEqual([[4, 4, 11]]);

        m.down(6, 4);
        m.move(7, 4);
        m.move(7, 4);
        m.move(8, 4);
        m.up();
        // moving without pressing doesn't paint
        m.move(9, 4);
        expect(touchedUp(4)).toBeInTheDocument();

        await user.click(tool('Undo'));
        expect(touchedUp(1)).toBeInTheDocument();
        await user.click(tool('Undo'));
        noneTouchedUp();
        expect(tool('Undo')).toBeDisabled();
        await user.click(tool('Redo'));
        await user.click(tool('Redo'));
        expect(touchedUp(4)).toBeInTheDocument();
        expect(tool('Redo')).toBeDisabled();

        // painting a brick its own colour changes nothing
        m.click(4, 4);
        expect(touchedUp(4)).toBeInTheDocument();
    });

    it('shows the colour and brush options only for the tools that use them', async () => {
        const user = await startMosaic();
        const options = () => ({
            color: toolbar().queryByRole('button', { name: /^Paint colour/ }),
            size: toolbar().queryByRole('combobox', { name: 'Brush size' }),
            shape: toolbar().queryByRole('group', { name: 'Brush shape' }),
        });
        const shown = () => Object.entries(options()).flatMap(([name, el]) => (el ? [name] : []));

        expect(shown()).toEqual([]);
        await user.click(tool('Brush'));
        expect(shown()).toEqual(['color', 'size', 'shape']);
        await user.click(tool('Eraser'));
        expect(shown()).toEqual(['size', 'shape']);
        await user.click(tool('Eyedropper: pick a colour from the map'));
        expect(shown()).toEqual(['color']);
        await user.click(tool('View'));
        expect(shown()).toEqual([]);
    });

    it('paints with bigger, round or square brushes', async () => {
        const user = await startMosaic();
        await paintWith(user, 'Black');
        await brush(user, 3, 'Square');
        map().click(5, 5);
        expect(touchedUp(9)).toBeInTheDocument();
        expect(screen.getByTitle('Black: 9')).toBeInTheDocument();

        await brush(user, 3, 'Round');
        expect(tool('Round brush')).toHaveAttribute('aria-pressed', 'true');
        map().click(10, 5);
        expect(touchedUp(14)).toBeInTheDocument();

        // the outline shows the whole brush under the mouse
        map().move(10, 5, 'mouse');
        expect(screen.getByTestId('brush-outline')).toHaveStyle({ width: `${(3 / 32) * 100}%` });
    });

    it('erases bricks, outlines the brush under the mouse, and clears touch-ups', async () => {
        const user = await startMosaic();
        const m = map();
        await user.click(tool('Eraser'));
        expect(screen.getByText(/remove bricks/)).toBeInTheDocument();
        m.click(2, 2);
        m.click(2, 3);
        expect(touchedUp(2)).toBeInTheDocument();

        m.move(5, 5, 'mouse');
        expect(screen.getByTestId('brush-outline')).toBeInTheDocument();
        fireEvent.pointerLeave(screen.getByLabelText(/^Card map/));
        expect(screen.queryByTestId('brush-outline')).not.toBeInTheDocument();
        // off the map
        m.move(999, 5, 'mouse');
        expect(screen.queryByTestId('brush-outline')).not.toBeInTheDocument();

        await user.click(tool('Clear all touch-ups'));
        noneTouchedUp();
        await user.click(tool('Undo'));
        expect(touchedUp(2)).toBeInTheDocument();
    });

    it('picks the paint colour from a brick with the eyedropper, then goes back to the brush', async () => {
        const user = await startMosaic();
        const m = map();
        await paintWith(user, 'Black');
        m.click(4, 4);
        await paintWith(user, 'White');
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: White');

        await user.click(tool('Eyedropper: pick a colour from the map'));
        expect(screen.getByText(/paint with its colour/)).toBeInTheDocument();
        expect(screen.getByLabelText(/pick its colour/)).toBeInTheDocument();
        m.move(4, 4, 'mouse');
        expect(screen.getByTestId('brush-outline')).toHaveStyle({ width: `${(1 / 32) * 100}%` });
        m.click(4, 4);
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: Black');
        expect(tool('Brush')).toHaveAttribute('aria-pressed', 'true');
        // picking doesn't change any bricks
        expect(touchedUp(1)).toBeInTheDocument();

        // an empty spot has no colour to pick, so the eyedropper stays on
        await user.click(tool('Eraser'));
        m.click(2, 2);
        await user.click(tool('Eyedropper: pick a colour from the map'));
        m.click(2, 2);
        expect(tool('Eyedropper: pick a colour from the map')).toHaveAttribute('aria-pressed', 'true');
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: Black');
    });

    it('compares before and after, without painting while showing before', async () => {
        const user = await startMosaic();
        expect(tool('Before / after')).toBeDisabled();
        await paintWith(user, 'Black');
        map().click(4, 4);

        await user.click(tool('Before / after'));
        expect(tool('Before / after')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText(/Showing the mosaic before touch-ups/)).toBeInTheDocument();
        map().click(8, 8);
        expect(touchedUp(1)).toBeInTheDocument();

        // picking a tool goes back to editing
        await user.click(tool('Eraser'));
        expect(tool('Before / after')).toHaveAttribute('aria-pressed', 'false');
    });

    it('cleans up stray bricks, after saying how many will change', async () => {
        const user = await startMosaic();
        await user.click(tool('Clean up stray bricks'));
        expect(screen.getByText('No stray bricks to change.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
        await user.keyboard('{Escape}');

        await paintWith(user, 'Black');
        map().click(4, 4);
        expect(screen.getByTitle('Black: 1')).toBeInTheDocument();

        await user.click(tool('Clean up stray bricks'));
        expect(screen.getByText('1 brick would change.')).toBeInTheDocument();
        await user.click(screen.getByRole('combobox', { name: 'Strays' }));
        await user.click(screen.getByRole('option', { name: 'Single bricks and pairs' }));
        await user.click(screen.getByRole('button', { name: 'Apply' }));
        expect(screen.queryByTitle('Black: 1')).not.toBeInTheDocument();

        await user.click(tool('Undo'));
        expect(screen.getByTitle('Black: 1')).toBeInTheDocument();
    });

    it('hides touch-ups made at another size until the size comes back', async () => {
        const user = await startMosaic();
        await user.click(tool('Eraser'));
        map().click(2, 2);
        // set straight to a value: the field snaps an empty value to 1, so clearing and typing gives 15, not 5
        const setAcross = (n: number) =>
            fireEvent.change(screen.getByRole('spinbutton', { name: 'Plates across' }), {
                target: { value: String(n) },
            });
        setAcross(5);
        expect(screen.getByText(/You touched up 1 brick on a \d+ × \d+ mosaic/)).toBeInTheDocument();
        expect(tool('Before / after')).toBeDisabled();

        setAcross(4);
        expect(touchedUp(1)).toBeInTheDocument();

        setAcross(5);
        await user.click(tool('Clear all touch-ups'));
        expect(screen.queryByText(/You touched up/)).not.toBeInTheDocument();
    });
});
