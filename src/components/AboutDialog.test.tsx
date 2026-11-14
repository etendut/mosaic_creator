import { screen, waitFor, within } from '@testing-library/react';
import { projectMenu, renderApp } from '../test/app';

describe('About', () => {
    it('shows the version, the first 8 characters of the build commit, linked to that commit', async () => {
        const user = renderApp();
        await user.click(screen.getByRole('button', { name: 'Project' }));
        expect(screen.getByRole('menuitem', { name: /About Version [0-9a-f]{8}$/ })).toBeInTheDocument();
        await user.keyboard('{Escape}');

        await projectMenu(user, /About/);
        const dialog = await screen.findByRole('dialog', { name: 'About Mosaic Creator' });
        const version = within(dialog).getByRole('link', { name: /^[0-9a-f]{8}$/ });
        expect(version).toHaveAttribute(
            'href',
            expect.stringMatching(new RegExp(`/commit/${version.textContent}[0-9a-f]{32}$`)),
        );
        expect(within(dialog).getByText(/your images stay on this device/)).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
