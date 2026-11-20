import { registerServiceWorker, serviceWorkerAllowed } from './pwa';

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

afterEach(() => {
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
        await registerServiceWorker(onUpdate, true);
        expect(container.register).toHaveBeenCalledWith('sw.js');
        expect(onUpdate).not.toHaveBeenCalled();
    });

    it('offers a waiting new version, and Reload hands over to it', async () => {
        const waiting = { postMessage: vi.fn() };
        const { container } = fakeServiceWorker({ waiting }, {});
        const onUpdate = vi.fn();
        await registerServiceWorker(onUpdate, true);
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
        await registerServiceWorker(onUpdate, true);
        let changed = () => {};
        reg.installing = { state: 'installing', addEventListener: (_t, f) => (changed = f) };
        handlers.updatefound();
        changed();
        expect(onUpdate).not.toHaveBeenCalled();
        reg.installing.state = 'installed';
        changed();
        expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('does nothing where it is not allowed', async () => {
        const { container } = fakeServiceWorker({}, null);
        await registerServiceWorker(vi.fn(), false);
        expect(container.register).not.toHaveBeenCalled();
    });
});
