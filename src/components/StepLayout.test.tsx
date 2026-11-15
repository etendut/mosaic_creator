import { fireEvent, screen, within } from '@testing-library/react';
import { chooseImage, goTo, renderApp, startMosaic } from '../test/app';

/** Make the screen phone-sized: media queries for desktop widths stop matching. */
const asPhone = () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
        matches: !/min-width/.test(query),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    return () => {
        window.matchMedia = original;
    };
};

let restore: () => void;
beforeEach(() => {
    restore = asPhone();
});
afterEach(() => restore());

const tools = () => within(screen.getByRole('toolbar', { name: 'Tools' }));

describe('Steps on a phone', () => {
    it('keeps the tools in a bar along the bottom, with one panel open at a time', async () => {
        const user = await startMosaic();
        expect(
            tools()
                .getAllByRole('button')
                .map((b) => b.textContent),
        ).toEqual(['Plate', 'Brick', 'Size', 'Colours', 'Used', 'Info']);
        // nothing open: the canvas has the screen
        expect(screen.queryByRole('region')).not.toBeInTheDocument();
        expect(screen.queryByRole('complementary', { name: 'Tools' })).not.toBeInTheDocument();

        await user.click(tools().getByRole('button', { name: 'Size' }));
        expect(tools().getByRole('button', { name: 'Size' })).toHaveAttribute('aria-expanded', 'true');
        const size = screen.getByRole('region', { name: 'Size' });
        expect(within(size).getByRole('spinbutton', { name: 'Plates across' })).toBeInTheDocument();

        // another group replaces it
        await user.click(tools().getByRole('button', { name: 'Plate' }));
        expect(screen.queryByRole('region', { name: 'Size' })).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Backing plate' })).toBeInTheDocument();

        // the same group again, the close button, or touching the canvas closes it
        await user.click(tools().getByRole('button', { name: 'Plate' }));
        expect(screen.queryByRole('region')).not.toBeInTheDocument();
        await user.click(tools().getByRole('button', { name: 'Colours' }));
        await user.click(screen.getByRole('button', { name: 'Close Colours' }));
        expect(screen.queryByRole('region')).not.toBeInTheDocument();
        // Info is the last button, and opens like any group
        await user.click(tools().getByRole('button', { name: 'Info' }));
        expect(within(screen.getByRole('region', { name: 'Info' })).getByText('32 × 20 bricks')).toBeInTheDocument();
        await user.click(tools().getByRole('button', { name: 'Brick' }));
        fireEvent.pointerDown(screen.getByLabelText('Card map'));
        expect(screen.queryByRole('region')).not.toBeInTheDocument();
    });

    it('offers the step’s secondary action in the menu', async () => {
        const user = await startMosaic();
        await goTo(user, 'Parts');
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        await user.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: /^Copy XML/ }));
        expect(await navigator.clipboard.readText()).toMatch(/^<INVENTORY>/);
        // only while that step is on screen
        await goTo(user, 'Print');
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        expect(within(screen.getByRole('menu')).queryByText('Copy XML')).not.toBeInTheDocument();
    });

    it('keeps Print cards just above the tool bar, with what it will print', async () => {
        const user = await startMosaic();
        await goTo(user, 'Print');
        expect(screen.getByText('The map page, on one sheet.')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Print map page' }));
        expect(window.print).toHaveBeenCalled();
        // a tool panel opens above it
        await user.click(tools().getByRole('button', { name: 'Paper' }));
        expect(screen.getByRole('region', { name: 'Paper' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Print map page' })).toBeInTheDocument();
    });

    it('puts Touch up’s tools in the bottom bar, in the same order as on desktop, with the palette above', async () => {
        const user = await startMosaic();
        await goTo(user, 'Touch up');
        // icons only, named for screen readers: history, tools, clean-up, clearing
        const buttons = tools().getAllByRole('button');
        expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
            'Undo',
            'Redo',
            'Before / after',
            'Brush',
            'Eraser',
            'Eyedropper',
            'Clean up single bricks',
            'Clean up single bricks and pairs',
            'Clear all touch-ups',
            'Info',
        ]);
        expect(buttons.every((b) => b.textContent === '')).toBe(true);
        // two rows, so every button stays wide: history and tools, then clean-up, clearing and Info
        const rows = [...screen.getByRole('toolbar', { name: 'Tools' }).children].map((row) =>
            within(row as HTMLElement)
                .getAllByRole('button')
                .map((b) => b.getAttribute('aria-label')),
        );
        expect(rows).toEqual([
            ['Undo', 'Redo', 'Before / after', 'Brush', 'Eraser', 'Eyedropper'],
            ['Clean up single bricks', 'Clean up single bricks and pairs', 'Clear all touch-ups', 'Info'],
        ]);
        expect(tools().getByRole('button', { name: 'Undo' })).toBeDisabled();
        expect(tools().getByRole('button', { name: 'Clear all touch-ups' })).toBeDisabled();
        expect(within(screen.getByRole('banner')).queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();

        // the palette is always above the bar; the brush is on from the start
        expect(tools().getByRole('button', { name: 'Brush' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('group', { name: 'Brush size' })).toBeInTheDocument();
        await user.click(tools().getByRole('button', { name: 'Eraser' }));
        expect(tools().getByRole('button', { name: 'Eraser' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: /^Paint colour/ })).toBeInTheDocument();

        // erase a brick, then the history and clearing in the bar
        const canvas = screen.getByLabelText(/^Card map/);
        canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 320, height: 200 }) as DOMRect;
        fireEvent.pointerDown(canvas, { clientX: 15, clientY: 15, pointerId: 1 });
        fireEvent.pointerUp(canvas);
        expect(tools().getByRole('button', { name: 'Undo' })).toBeEnabled();
        await user.click(tools().getByRole('button', { name: 'Before / after' }));
        expect(tools().getByRole('button', { name: 'Before / after' })).toHaveAttribute('aria-pressed', 'true');
        await user.click(tools().getByRole('button', { name: 'Undo' }));
        await user.click(tools().getByRole('button', { name: 'Redo' }));
        await user.click(tools().getByRole('button', { name: 'Clean up single bricks' }));
        expect(screen.getByText(/Cleaned up|No stray bricks/)).toBeInTheDocument();
        await user.click(tools().getByRole('button', { name: 'Clear all touch-ups' }));
        expect(screen.getByText('Touch-ups cleared. Undo brings them back.')).toBeInTheDocument();
    });

    it("shows the step's name and main action in the app bar", async () => {
        const user = renderApp();
        expect(screen.getByRole('heading', { name: 'Image', level: 1 })).toBeInTheDocument();
        // no tools until there's an image to change
        expect(screen.queryByRole('toolbar', { name: 'Tools' })).not.toBeInTheDocument();
        await chooseImage(user);
        await screen.findByTestId('cropper');
        expect(within(screen.getByRole('banner')).getByRole('button', { name: 'Use this image' })).toBeInTheDocument();
        expect(
            tools()
                .getAllByRole('button')
                .map((b) => b.textContent),
        ).toEqual(['Frame', 'Adjust', 'Info']);
    });
});
