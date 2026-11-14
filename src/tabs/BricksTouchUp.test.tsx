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

const touchedUp = (n: number) => screen.getByText(`${n} brick${n === 1 ? '' : 's'} touched up.`);

const paintWith = async (user: User, name: string) => {
    await user.click(screen.getByRole('button', { name: /^Paint colour/ }));
    await user.click(within(screen.getByRole('menu')).getByText(name));
};

describe('Touching up bricks', () => {
    it('paints single bricks, drags to paint several, and undoes a drag in one step', async () => {
        const user = await startMosaic();
        const m = map();
        // viewing: clicks do nothing
        m.click(4, 4);
        expect(screen.queryByText(/touched up/)).not.toBeInTheDocument();

        await paintWith(user, 'Black');
        expect(screen.getByRole('button', { name: 'Paint' })).toHaveAttribute('aria-pressed', 'true');
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

        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(touchedUp(1)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.queryByText(/touched up/)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
        await user.click(screen.getByRole('button', { name: 'Redo' }));
        await user.click(screen.getByRole('button', { name: 'Redo' }));
        expect(touchedUp(4)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

        // painting a brick its own colour changes nothing
        m.click(4, 4);
        expect(touchedUp(4)).toBeInTheDocument();
    });

    it('erases bricks, outlines the brick under the mouse, and clears touch-ups', async () => {
        const user = await startMosaic();
        const m = map();
        await user.click(screen.getByRole('button', { name: 'Erase' }));
        expect(screen.getByText(/remove bricks/)).toBeInTheDocument();
        m.click(2, 2);
        m.click(2, 3);
        expect(touchedUp(2)).toBeInTheDocument();

        m.move(5, 5, 'mouse');
        expect(screen.getByTestId('brick-outline')).toBeInTheDocument();
        fireEvent.pointerLeave(screen.getByLabelText(/^Card map/));
        expect(screen.queryByTestId('brick-outline')).not.toBeInTheDocument();
        // off the map
        m.move(999, 5, 'mouse');
        expect(screen.queryByTestId('brick-outline')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Clear touch-ups' }));
        expect(screen.queryByText(/touched up/)).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(touchedUp(2)).toBeInTheDocument();
    });

    it('cleans up stray bricks, after saying how many will change', async () => {
        const user = await startMosaic();
        expect(screen.getByText('No stray bricks to change.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Clean up' })).toBeDisabled();

        await paintWith(user, 'Black');
        map().click(4, 4);
        expect(screen.getByTitle('Black: 1')).toBeInTheDocument();
        expect(screen.getByText('1 brick would change.')).toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'Clean up' }));
        await user.click(screen.getByRole('option', { name: 'Single bricks and pairs' }));
        await user.click(screen.getByRole('button', { name: 'Clean up' }));
        expect(screen.queryByTitle('Black: 1')).not.toBeInTheDocument();
        expect(screen.getByText('No stray bricks to change.')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(screen.getByTitle('Black: 1')).toBeInTheDocument();
    });

    it('hides touch-ups made at another size until the size comes back', async () => {
        const user = await startMosaic();
        await user.click(screen.getByRole('button', { name: 'Erase' }));
        map().click(2, 2);
        // set straight to a value: the field snaps an empty value to 1, so clearing and typing gives 15, not 5
        const setAcross = (n: number) =>
            fireEvent.change(screen.getByRole('spinbutton', { name: 'Plates across' }), {
                target: { value: String(n) },
            });
        setAcross(5);
        expect(screen.getByText(/You touched up 1 brick on a \d+ × \d+ mosaic/)).toBeInTheDocument();

        setAcross(4);
        expect(touchedUp(1)).toBeInTheDocument();

        setAcross(5);
        await user.click(screen.getByRole('button', { name: 'Clear' }));
        expect(screen.queryByText(/touched up/)).not.toBeInTheDocument();
    });
});
