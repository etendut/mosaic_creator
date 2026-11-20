import { act, screen, within } from '@testing-library/react';
import { renderApp } from '../test/app';
import { TOAST_MS } from '../ui/Toast';

// a new version is waiting as soon as the app registers its service worker
const reload = vi.fn();
vi.mock('../lib/pwa', async (original) => ({
    ...(await original<typeof import('../lib/pwa')>()),
    registerServiceWorker: async (onUpdate: (reload: () => void) => void) => onUpdate(reload),
}));

describe('A new version', () => {
    it('is offered with Reload, in a Toast that waits until you act on it', async () => {
        const user = renderApp();
        const toast = await screen.findByRole('status');
        expect(toast).toHaveTextContent('A new version is ready.');
        // it doesn't time out like other messages
        await act(() => new Promise((done) => setTimeout(done, TOAST_MS + 500)));
        expect(screen.getByRole('status')).toBeInTheDocument();
        await user.click(within(toast).getByRole('button', { name: 'Reload' }));
        expect(reload).toHaveBeenCalled();
    });

    it('can be closed, and nothing reloads by itself', async () => {
        reload.mockClear();
        const user = renderApp();
        const toast = await screen.findByRole('status');
        await user.click(within(toast).getByRole('button', { name: 'Close' }));
        expect(screen.queryByText('A new version is ready.')).not.toBeInTheDocument();
        expect(reload).not.toHaveBeenCalled();
    });
});
