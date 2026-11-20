import { fireEvent, screen, within } from '@testing-library/react';
import { goTo, info, startMosaic, type User } from '../test/app';

/**
 * The map canvas, laid out so each brick is 10 px square on screen (jsdom does no layout), and a way to press, move
 * and release the pointer over a brick by its column and row.
 */
const map = () => {
    const canvas = screen.getByLabelText(/^Card map/);
    const [width, height] = [canvas.dataset.columns, canvas.dataset.rows];
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

/** A tool or action by name: the tools are in the left column, undo, redo and before/after in the app bar. */
/** A button in the tools column (a toast can have its own Undo). */
const tool = (name: string | RegExp) =>
    within(screen.getByRole('complementary', { name: 'Tools' })).getByRole('button', { name });
/** The toast's action button. */
const toastAction = (name: string) => within(screen.getByRole('status')).getByRole('button', { name });
/** Bricks touched up to black (BrickLink 11), from the saved touch-ups. */
const blackBricks = (): number =>
    (JSON.parse(localStorage.getItem('mosaic-creator:settings')!).touchUps?.edits ?? []).filter(
        (e: unknown[]) => e[2] === 11,
    ).length;
/** The touched-up count, from the step's Info. */
const touchedUp = (n: number) => expect(info('Touched up')).toBe(`${n} brick${n === 1 ? '' : 's'}`);
const noneTouchedUp = () => touchedUp(0);

const paintWith = async (user: User, name: string) => {
    if (tool('Brush').getAttribute('aria-pressed') !== 'true') await user.click(tool('Brush'));
    await user.click(tool(/^Paint colour/));
    await user.click(within(screen.getByRole('menu')).getByText(name));
};

const brush = async (user: User, size: number, shape: 'Round' | 'Square') => {
    await user.click(tool(`${size} × ${size}`));
    await user.click(tool(`${shape} brush`));
};

/** Open the app with a mosaic, on the Touch up step. */
const startTouchUp = async () => {
    const user = await startMosaic();
    await goTo(user, 'Touch up');
    return user;
};

describe('Touch up step', () => {
    it('shows how many of each colour the mosaic uses in the colour list, as on Bricks, following touch-ups', async () => {
        const user = await startTouchUp();
        /** The colour list's counts, by colour name: only the colours on the mosaic have one. */
        const listCounts = async () => {
            await user.click(tool(/^Paint colour/));
            const rows = within(screen.getByRole('menu')).getAllByRole('menuitem');
            const counts = Object.fromEntries(
                rows
                    .map((row) => row.getAttribute('aria-label')?.split(': '))
                    .filter((pair): pair is string[] => pair?.length === 2)
                    .map(([name, n]) => [name, Number(n.replace(/,/g, ''))]),
            );
            await user.keyboard('{Escape}');
            return counts;
        };
        const before = await listCounts();
        // the same counts as Colours used on Bricks
        await goTo(user, 'Bricks');
        const onBricks = Object.fromEntries(
            within(screen.getByRole('group', { name: 'Colours used' }))
                .getAllByRole('button')
                .map((b) => b.getAttribute('aria-label')!.split(': '))
                .map(([name, n]) => [name, Number(n)]),
        );
        expect(before).toEqual(onBricks);
        expect(before.Black).toBeUndefined();

        // painting a brick black adds one black brick and takes one from its old colour
        await goTo(user, 'Touch up');
        await paintWith(user, 'Black');
        map().click(5, 5);
        const after = await listCounts();
        expect(after.Black).toBe(1);
        const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0);
        expect(total(after)).toBe(total(before));
    });

    it('lays the tools out in one consistent column: history, tools, palette, clean-up, clearing', async () => {
        await startTouchUp();
        expect(screen.getByRole('heading', { name: 'Touch up' })).toBeInTheDocument();
        const column = within(screen.getByRole('complementary', { name: 'Tools' }));
        const names = column
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label') ?? b.textContent)
            .filter((n) => n && !/×/.test(n) && !/brush$/.test(n));
        expect(names).toEqual([
            'Undo',
            'Redo',
            'Before',
            'After',
            'Brush',
            'Eraser',
            'Eyedropper',
            expect.stringMatching(/^Paint colour/),
            'Clean up single bricks',
            'Clean up single bricks and pairs',
            'Clear all touch-ups',
        ]);
        expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
        // on desktop every tool shows its name, not just an icon
        for (const name of ['Undo', 'Redo', 'Before', 'After', 'Brush', 'Eraser', 'Eyedropper', 'Clear all touch-ups'])
            expect(column.getByRole('button', { name })).toHaveTextContent(name);
        expect(column.getByText('Brush size')).toBeInTheDocument();
        expect(column.getByRole('button', { name: 'Round brush' })).toHaveTextContent('Round');
        // the brush is on from the start
        expect(tool('Brush')).toHaveAttribute('aria-pressed', 'true');
    });

    it('is where touch-ups are made; the Bricks step shows them on its map and says how many', async () => {
        const user = await startTouchUp();
        await user.click(tool('Eraser'));
        map().click(2, 2);
        await paintWith(user, 'Black');
        map().click(4, 4);
        await goTo(user, 'Bricks');
        expect(screen.queryByRole('toolbar', { name: 'Touch up' })).not.toBeInTheDocument();
        expect(info('Touched up')).toBe('2 bricks');
        // the colours used, and so the cards and parts, follow the touched-up bricks
        expect(screen.getByTitle('Black: 1')).toBeInTheDocument();
    });

    it('paints single bricks, drags to paint several, and undoes a drag in one step', async () => {
        const user = await startTouchUp();
        const m = map();
        await paintWith(user, 'Black');
        expect(tool('Brush')).toHaveAttribute('aria-pressed', 'true');
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: Black');
        m.click(4, 4);
        touchedUp(1);
        // the painted brick is saved with the settings
        expect(blackBricks()).toBe(1);
        expect(JSON.parse(localStorage.getItem('mosaic-creator:settings')!).touchUps.edits).toEqual([[4, 4, 11]]);

        m.down(6, 4);
        m.move(7, 4);
        m.move(7, 4);
        m.move(8, 4);
        m.up();
        // moving without pressing doesn't paint
        m.move(9, 4);
        touchedUp(4);

        await user.click(tool('Undo'));
        touchedUp(1);
        await user.click(tool('Undo'));
        noneTouchedUp();
        expect(tool('Undo')).toBeDisabled();
        await user.click(tool('Redo'));
        await user.click(tool('Redo'));
        touchedUp(4);
        expect(tool('Redo')).toBeDisabled();

        // painting a brick its own colour changes nothing
        m.click(4, 4);
        touchedUp(4);
    });

    it('keeps the brush palette in view for every tool', async () => {
        const user = await startTouchUp();
        for (const name of ['Brush', 'Eraser', 'Eyedropper']) {
            await user.click(tool(name));
            expect(screen.getByRole('button', { name: /^Paint colour/ })).toHaveAttribute('aria-haspopup', 'menu');
            expect(screen.getByRole('group', { name: 'Brush size' })).toBeInTheDocument();
            expect(screen.getByRole('group', { name: 'Brush shape' })).toBeInTheDocument();
        }
    });

    it('paints with bigger, round or square brushes', async () => {
        const user = await startTouchUp();
        await paintWith(user, 'Black');
        await brush(user, 3, 'Square');
        map().click(5, 5);
        touchedUp(9);
        expect(blackBricks()).toBe(9);

        await brush(user, 3, 'Round');
        expect(tool('Round brush')).toHaveAttribute('aria-pressed', 'true');
        map().click(10, 5);
        touchedUp(14);

        // the outline shows the whole brush under the mouse
        map().move(10, 5, 'mouse');
        expect(screen.getByTestId('brush-outline')).toHaveStyle({ width: `${(3 / 32) * 100}%` });
    });

    it('erases bricks, outlines the brush under the mouse, and clears touch-ups', async () => {
        const user = await startTouchUp();
        const m = map();
        await user.click(tool('Eraser'));
        expect(tool('Eraser')).toHaveAttribute('aria-pressed', 'true');
        m.click(2, 2);
        m.click(2, 3);
        touchedUp(2);

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
        touchedUp(2);

        // the toast's Undo does the same, with the history as it is when pressed, not when the toast was made
        await user.click(tool('Clear all touch-ups'));
        expect(screen.getByRole('status')).toHaveTextContent('Touch-ups cleared.');
        noneTouchedUp();
        await user.click(toastAction('Undo'));
        touchedUp(2);
    });

    it('picks the paint colour from a brick with the eyedropper, and stays on it like the other tools', async () => {
        const user = await startTouchUp();
        const m = map();
        const eyedropper = () => tool('Eyedropper');
        await paintWith(user, 'Black');
        m.click(4, 4);
        await paintWith(user, 'White');
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: White');

        await user.click(eyedropper());
        expect(tool('Eyedropper')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText(/pick its colour/)).toBeInTheDocument();
        m.move(4, 4, 'mouse');
        expect(screen.getByTestId('brush-outline')).toHaveStyle({ width: `${(1 / 32) * 100}%` });
        m.click(4, 4);
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: Black');
        expect(eyedropper()).toHaveAttribute('aria-pressed', 'true');
        // picking doesn't change any bricks
        touchedUp(1);

        // an empty spot has no colour to pick
        await user.click(tool('Eraser'));
        m.click(2, 2);
        await user.click(eyedropper());
        m.click(2, 2);
        expect(eyedropper()).toHaveAttribute('aria-pressed', 'true');
        expect(tool(/^Paint colour/)).toHaveAccessibleName('Paint colour: Black');

        // the brush then paints with the picked colour
        await user.click(tool('Brush'));
        m.click(6, 6);
        expect(blackBricks()).toBe(2);
    });

    it('compares before and after, without painting while showing before', async () => {
        const user = await startTouchUp();
        // before / after is a two-way toggle, like the brush shape; nothing to compare yet
        expect(tool('Before')).toBeDisabled();
        expect(tool('After')).toHaveAttribute('aria-pressed', 'true');
        await paintWith(user, 'Black');
        map().click(4, 4);

        await user.click(tool('Before'));
        expect(tool('Before')).toHaveAttribute('aria-pressed', 'true');
        map().click(8, 8);
        touchedUp(1);

        // picking a tool goes back to editing
        await user.click(tool('Eraser'));
        expect(tool('After')).toHaveAttribute('aria-pressed', 'true');
    });

    it('cleans up stray bricks in one click, saying how many changed', async () => {
        const user = await startTouchUp();
        await user.click(tool('Clean up single bricks'));
        expect(screen.getByText('No stray bricks to clean up.')).toBeInTheDocument();

        await paintWith(user, 'Black');
        map().click(4, 4);
        expect(blackBricks()).toBe(1);
        await user.click(tool('Clean up single bricks'));
        expect(screen.getByText('Cleaned up 1 brick.')).toBeInTheDocument();
        expect(blackBricks()).toBe(0);
        // the toast offers Undo
        await user.click(toastAction('Undo'));
        expect(blackBricks()).toBe(1);
        await user.click(tool('Clean up single bricks'));
        expect(blackBricks()).toBe(0);

        // pairs too
        await user.click(tool('Undo'));
        map().click(5, 4);
        expect(blackBricks()).toBe(2);
        await user.click(tool('Clean up single bricks'));
        expect(screen.getByText('No stray bricks to clean up.')).toBeInTheDocument();
        await user.click(tool('Clean up single bricks and pairs'));
        expect(screen.getByText('Cleaned up 2 bricks.')).toBeInTheDocument();
        expect(blackBricks()).toBe(0);

        await user.click(tool('Undo'));
        expect(blackBricks()).toBe(2);
    });

    it('zooms with the control or Ctrl + wheel, and scrolls the zoomed map with Space or the middle button', async () => {
        const user = await startTouchUp();
        const frame = screen.getByTestId('map-frame');
        const box = screen.getByTestId('map-scroll');
        box.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 200 }) as DOMRect;
        const zoom = () => Number(frame.dataset.zoom);
        expect(screen.getByLabelText('Zoom level')).toHaveTextContent('100%');
        expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();

        await user.click(screen.getByRole('button', { name: 'Zoom in' }));
        expect(screen.getByLabelText('Zoom level')).toHaveTextContent('150%');
        await user.click(screen.getByRole('button', { name: 'Zoom out' }));
        expect(zoom()).toBe(1);

        // zoom in as far as it goes: 2000%, for hitting single bricks with a finger
        while (!(screen.getByRole('button', { name: 'Zoom in' }) as HTMLButtonElement).disabled)
            await user.click(screen.getByRole('button', { name: 'Zoom in' }));
        expect(screen.getByLabelText('Zoom level')).toHaveTextContent('2000%');
        await user.click(screen.getByRole('button', { name: 'Fit to screen' }));

        // a plain wheel scrolls; Ctrl + wheel (or a trackpad pinch) zooms around the pointer
        fireEvent.wheel(box, { deltaY: -500, clientX: 160, clientY: 100 });
        expect(zoom()).toBe(1);
        fireEvent.wheel(box, { deltaY: -500, clientX: 160, clientY: 100, ctrlKey: true });
        expect(zoom()).toBeGreaterThan(1);
        await user.click(screen.getByRole('button', { name: 'Fit to screen' }));
        expect(zoom()).toBe(1);

        // Space and drag scrolls the map, without painting
        await user.click(screen.getByRole('button', { name: 'Zoom in' }));
        box.scrollLeft = 100;
        box.scrollTop = 50;
        fireEvent.keyDown(window, { code: 'Space' });
        fireEvent.pointerDown(box, { clientX: 100, clientY: 100, pointerId: 7, pointerType: 'mouse', button: 0 });
        fireEvent.pointerMove(box, { clientX: 140, clientY: 120, pointerId: 7, pointerType: 'mouse' });
        fireEvent.pointerUp(box, { pointerId: 7, pointerType: 'mouse' });
        fireEvent.keyUp(window, { code: 'Space' });
        expect([box.scrollLeft, box.scrollTop]).toEqual([60, 30]);
        noneTouchedUp();

        // so does a middle-button drag
        fireEvent.pointerDown(box, { clientX: 140, clientY: 120, pointerId: 8, pointerType: 'mouse', button: 1 });
        fireEvent.pointerMove(box, { clientX: 120, clientY: 110, pointerId: 8, pointerType: 'mouse' });
        fireEvent.pointerUp(box, { pointerId: 8, pointerType: 'mouse' });
        expect([box.scrollLeft, box.scrollTop]).toEqual([80, 40]);
        noneTouchedUp();

        // painting still lands on the brick under the pointer
        map().click(4, 4);
        touchedUp(1);
    });

    it('on touch: a tap or a drag paints, and two fingers pinch and pan without painting', async () => {
        await startTouchUp();
        const frame = screen.getByTestId('map-frame');
        screen.getByTestId('map-scroll').getBoundingClientRect = () =>
            ({ left: 0, top: 0, width: 320, height: 200 }) as DOMRect;
        map(); // lays the canvas out at 10 px a brick
        const touch = (id: number, x: number, y: number) => ({
            clientX: x * 10 + 5,
            clientY: y * 10 + 5,
            pointerId: id,
            pointerType: 'touch',
        });
        const canvas = screen.getByLabelText(/^Card map/);

        // a finger down paints nothing yet: it might be the start of a pinch
        fireEvent.pointerDown(canvas, touch(1, 4, 4));
        noneTouchedUp();
        fireEvent.pointerUp(canvas, touch(1, 4, 4));
        touchedUp(1);

        // a finger that moves paints from where it went down
        fireEvent.pointerDown(canvas, touch(2, 6, 6));
        fireEvent.pointerMove(canvas, touch(2, 7, 6));
        fireEvent.pointerUp(canvas, touch(2, 7, 6));
        touchedUp(3);

        // two fingers spreading apart zoom in, and paint nothing
        fireEvent.pointerDown(canvas, touch(3, 10, 10));
        fireEvent.pointerDown(canvas, touch(4, 12, 10));
        fireEvent.pointerMove(canvas, touch(4, 16, 10));
        fireEvent.pointerUp(canvas, touch(4, 16, 10));
        fireEvent.pointerUp(canvas, touch(3, 10, 10));
        expect(Number(frame.dataset.zoom)).toBeGreaterThan(1);
        touchedUp(3);
    });

    it('hides touch-ups made at another size until the size comes back, and says so on both steps', async () => {
        const user = await startTouchUp();
        await user.click(tool('Eraser'));
        map().click(2, 2);
        await goTo(user, 'Bricks');
        // set straight to a value: the field snaps an empty value to 1, so clearing and typing gives 15, not 5
        const setAcross = (n: number) =>
            fireEvent.change(screen.getByRole('spinbutton', { name: 'Plates across' }), {
                target: { value: String(n) },
            });
        const hidden = /You touched up 1 brick on a \d+ × \d+ mosaic/;
        setAcross(5);
        expect(screen.getByText(hidden)).toBeInTheDocument();
        await goTo(user, 'Touch up');
        expect(screen.getByText(hidden)).toBeInTheDocument();
        expect(tool('Before')).toBeDisabled();

        await goTo(user, 'Bricks');
        setAcross(4);
        expect(info('Touched up')).toBe('1 brick');

        setAcross(5);
        await goTo(user, 'Touch up');
        await user.click(tool('Clear all touch-ups'));
        expect(screen.queryByText(/You touched up/)).not.toBeInTheDocument();
    });
});
