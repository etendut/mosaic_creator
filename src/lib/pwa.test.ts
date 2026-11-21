import { registerServiceWorker, serviceWorkerAllowed, UPDATE_CHECK_MS } from './pwa';

const live = { protocol: 'https:', hostname: 'etendut.github.io', pathname: '/mosaic_creator/' };

/** A stand-in for the browser's service worker container, with one registration whose state the test sets. */
const fakeServiceWorker = (registration: { waiting?: object | null }, controller: object | null) => {
    const handlers: Record<string, () => void> = {};
    const reg = {
        ...registration,
        installing: null as null | { state: string; addEventListener: (t: string, f: () => void) => void },
        addEventListener: (type: string, listen: () => void) => (handlers[type] = listen),
        update: vi.fn(async () => {}),
    };
    const container = {
        controller,
        register: vi.fn(async () => reg),
        addEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
    return { container, reg, handlers };
};

// each registration's checks (on coming back, and hourly), stopped after each test
const stops: (() => void)[] = [];
const register = async (...args: Parameters<typeof registerServiceWorker>) => {
    const stop = await registerServiceWorker(...args);
    stops.push(stop);
    return stop;
};

afterEach(() => {
    stops.splice(0).forEach((stop) => stop());
    Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('serviceWorkerAllowed', () => {
    it('is a built app over https or localhost: never a PR preview, plain http elsewhere, or a dev build', () => {
        fakeServiceWorker({}, null);
        expect(serviceWorkerAllowed(live, true)).toBe(true);
        expect(serviceWorkerAllowed({ ...live, pathname: '/mosaic_creator/pr-preview/pr-63/' }, true)).toBe(false);
        expect(serviceWorkerAllowed({ ...live, protocol: 'file:' }, true)).toBe(false);
        expect(serviceWorkerAllowed({ ...live, protocol: 'http:' }, true)).toBe(false);
        // a build tried on this computer
        expect(serviceWorkerAllowed({ ...live, protocol: 'http:', hostname: 'localhost' }, true)).toBe(true);
        expect(serviceWorkerAllowed(live, false)).toBe(false);
    });

    it('needs a browser with service workers', () => {
        expect(serviceWorkerAllowed(live, true)).toBe(false);
    });
});

describe('registerServiceWorker', () => {
    it("registers this commit's worker, and offers nothing on the first install", async () => {
        const { container } = fakeServiceWorker({ waiting: { postMessage: vi.fn() } }, null);
        const onUpdate = vi.fn();
        await register(onUpdate, true);
        expect(container.register).toHaveBeenCalledWith('sw.js');
        expect(onUpdate).not.toHaveBeenCalled();
    });

    it('offers a waiting new version, and Reload hands over to it', async () => {
        const waiting = { postMessage: vi.fn() };
        const { container } = fakeServiceWorker({ waiting }, {});
        const onUpdate = vi.fn();
        await register(onUpdate, true);
        expect(onUpdate).toHaveBeenCalledTimes(1);
        onUpdate.mock.calls[0][0]();
        expect(waiting.postMessage).toHaveBeenCalledWith('skip-waiting');
        expect(container.addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function), {
            once: true,
        });
    });

    it('offers a version that finishes installing while the app is open', async () => {
        const { reg, handlers } = fakeServiceWorker({ waiting: null }, {});
        const onUpdate = vi.fn();
        await register(onUpdate, true);
        let changed = () => {};
        reg.installing = { state: 'installing', addEventListener: (_t, f) => (changed = f) };
        handlers.updatefound();
        changed();
        expect(onUpdate).not.toHaveBeenCalled();
        reg.installing.state = 'installed';
        changed();
        expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('looks for a new version as it starts, each time you come back to the app, and every hour', async () => {
        vi.useFakeTimers();
        try {
            const { reg } = fakeServiceWorker({ waiting: null }, {});
            const stop = await register(vi.fn(), true);
            expect(reg.update).toHaveBeenCalledTimes(1);

            // switching away doesn't check; coming back does
            const visibility = vi.spyOn(document, 'visibilityState', 'get');
            visibility.mockReturnValue('hidden');
            document.dispatchEvent(new Event('visibilitychange'));
            expect(reg.update).toHaveBeenCalledTimes(1);
            visibility.mockReturnValue('visible');
            document.dispatchEvent(new Event('visibilitychange'));
            expect(reg.update).toHaveBeenCalledTimes(2);

            // an app left open in view checks each hour
            vi.advanceTimersByTime(UPDATE_CHECK_MS);
            expect(reg.update).toHaveBeenCalledTimes(3);

            // once stopped (the app has gone), neither checks
            stop();
            document.dispatchEvent(new Event('visibilitychange'));
            vi.advanceTimersByTime(UPDATE_CHECK_MS * 2);
            expect(reg.update).toHaveBeenCalledTimes(3);
            visibility.mockRestore();
        } finally {
            vi.useRealTimers();
        }
    });

    it('carries on when a check fails, as it does offline', async () => {
        const { reg } = fakeServiceWorker({ waiting: null }, {});
        reg.update.mockRejectedValue(new Error('offline'));
        await expect(register(vi.fn(), true)).resolves.toEqual(expect.any(Function));
    });

    it('does nothing where it is not allowed', async () => {
        const { container } = fakeServiceWorker({}, null);
        await register(vi.fn(), false);
        expect(container.register).not.toHaveBeenCalled();
    });
});
