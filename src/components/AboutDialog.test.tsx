import { screen, waitFor, within } from '@testing-library/react';
import { projectMenu, renderApp } from '../test/app';

describe('About', () => {
    it('shows the version as major.PR.0, and the build commit, linked to that commit', async () => {
        const user = renderApp();
        await user.click(screen.getByRole('button', { name: 'Menu' }));
        // a build here is a local one: the last merged PR, marked dev (CI's own builds are previews)
        expect(
            screen.getByRole('menuitem', { name: /^About Version \d+\.\d+\.0(-dev|-preview)?$/ }),
        ).toBeInTheDocument();
        await user.keyboard('{Escape}');

        await projectMenu(user, /About/);
        const dialog = await screen.findByRole('dialog', { name: 'About Mosaic Creator' });
        expect(within(dialog).getByText(/You're using version \d+\.\d+\.0/)).toBeInTheDocument();
        const build = within(dialog).getByRole('link', { name: /^[0-9a-f]{7}$/ });
        expect(build).toHaveAttribute(
            'href',
            expect.stringMatching(new RegExp(`/commit/${build.textContent}[0-9a-f]{33}$`)),
        );
        expect(within(dialog).getByText(/your images stay on this device/)).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Close' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
