import { act, screen, within } from '@testing-library/react';
import { watchInstall } from '../lib/pwa';
import { renderApp, type User } from '../test/app';

const menu = async (user: User) => {
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    return within(screen.getByRole('menu'));
};
const installItem = (items: ReturnType<typeof within>) => items.queryByRole('menuitem', { name: /^Install app/ });

/** The browser's offer to install, as Chrome and Edge send it. */
const offerInstall = () => {
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
        prompt: vi.fn(async () => {}),
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    act(() => {
        window.dispatchEvent(event);
    });
    return event;
};

const setUserAgent = (agent: string) =>
    Object.defineProperty(navigator, 'userAgent', { value: agent, configurable: true });

beforeAll(() => watchInstall());
afterEach(() => {
    Reflect.deleteProperty(navigator, 'userAgent');
    // the installed app uses up the offer
    act(() => {
        window.dispatchEvent(new Event('appinstalled'));
    });
});

describe('Install app in ☰', () => {
    it("isn't offered until the browser can install the app", async () => {
        const user = renderApp();
        expect(installItem(await menu(user))).not.toBeInTheDocument();
    });

    it("is offered when the browser can install it, and opens the browser's install", async () => {
        const user = renderApp();
        const event = offerInstall();
        expect(event.defaultPrevented).toBe(true);
        const item = installItem(await menu(user))!;
        expect(item).toHaveTextContent('Use it offline, in its own window');
        await user.click(item);
        expect(event.prompt).toHaveBeenCalled();
        // the offer is used up
        expect(installItem(await menu(user))).not.toBeInTheDocument();
    });

    it('goes once the app is installed', async () => {
        const user = renderApp();
        offerInstall();
        act(() => {
            window.dispatchEvent(new Event('appinstalled'));
        });
        expect(installItem(await menu(user))).not.toBeInTheDocument();
    });

    it("says how to install on an iPhone, where a page can't start it", async () => {
        setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1');
        const user = renderApp();
        const item = installItem(await menu(user))!;
        expect(item).toHaveTextContent('In Safari, tap Share, then Add to Home Screen');
        await user.click(item);
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
});
