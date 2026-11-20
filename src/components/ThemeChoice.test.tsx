import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../app/App';
import AppProviders from '../app/AppProviders';
import { COLOR_SCHEME_ATTRIBUTE } from '../app/theme';
import { goTo, renderApp, startMosaic, type User } from '../test/app';

const openMenu = async (user: User) => {
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    return within(screen.getByRole('group', { name: 'Theme' }));
};
const choice = (group: ReturnType<typeof within>, name: RegExp) => group.getByRole('menuitemradio', { name });
const scheme = () => document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE);

describe('Theme in ☰', () => {
    it('offers Auto, Light and Dark, with Auto chosen at first', async () => {
        const group = await openMenu(renderApp());
        expect(group.getAllByRole('menuitemradio').map((item) => item.textContent)).toEqual([
            'AutoFollows this device',
            'Light',
            'Dark',
        ]);
        expect(choice(group, /^Auto/)).toHaveAttribute('aria-checked', 'true');
        expect(choice(group, /^Light/)).toHaveAttribute('aria-checked', 'false');
        expect(choice(group, /^Dark/)).toHaveAttribute('aria-checked', 'false');
    });

    it('applies each choice at once, with no toast, and keeps the menu open to compare', async () => {
        const user = renderApp();
        const group = await openMenu(user);

        await user.click(choice(group, /^Dark/));
        expect(scheme()).toBe('dark');
        expect(choice(group, /^Dark/)).toHaveAttribute('aria-checked', 'true');
        expect(choice(group, /^Auto/)).toHaveAttribute('aria-checked', 'false');
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();

        await user.click(choice(group, /^Light/));
        expect(scheme()).toBe('light');
        expect(choice(group, /^Light/)).toHaveAttribute('aria-checked', 'true');

        // Auto follows the device, which is light here (jsdom reports no dark preference)
        await user.click(choice(group, /^Auto/));
        expect(choice(group, /^Auto/)).toHaveAttribute('aria-checked', 'true');
        expect(scheme()).toBe('light');
    });

    it('remembers the choice in this browser', async () => {
        const user = renderApp();
        await user.click(choice(await openMenu(user), /^Dark/));
        expect(localStorage.getItem('mui-mode')).toBe('dark');

        // a fresh visit
        cleanup();
        render(<App />, { wrapper: AppProviders });
        expect(scheme()).toBe('dark');
        expect(choice(await openMenu(userEvent.setup()), /^Dark/)).toHaveAttribute('aria-checked', 'true');
    });

    it('opens ☰ on its first item, and the arrow keys reach the theme items', async () => {
        const user = renderApp();
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        expect(document.activeElement).toHaveTextContent(/^Open project/);
        await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
        // up from the top wraps to About, then Show me around, then the last theme item
        expect(document.activeElement).toHaveAttribute('role', 'menuitemradio');
        expect(document.activeElement).toHaveTextContent('Dark');
        await user.keyboard('{Enter}');
        expect(scheme()).toBe('dark');
    });

    it('keeps printed sheets light whatever the choice', async () => {
        const user = await startMosaic();
        await user.click(choice(await openMenu(user), /^Dark/));
        await user.keyboard('{Escape}');
        await goTo(user, 'Print');
        expect(scheme()).toBe('dark');
        const sheets = document.querySelectorAll(`[${COLOR_SCHEME_ATTRIBUTE}="light"]`);
        expect(sheets.length).toBeGreaterThan(0);
    });
});
