/**
 * The installable, offline app (docs/design-system/README.md, "Installing and offline"): the service worker in
 * public/sw.js, installing from ☰, and asking to keep this browser's storage once installed.
 */

/**
 * A built app served over https (or localhost, to try a build): not the dev server, not a file opened from disk, and
 * never a PR preview, which shares the live site's origin and path.
 */
export const serviceWorkerAllowed = (
    location: Pick<Location, 'protocol' | 'hostname' | 'pathname'> = window.location,
    production: boolean = import.meta.env.PROD,
) =>
    production &&
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.hostname === 'localhost') &&
    !location.pathname.includes('/pr-preview/');

/** How often an app left open looks for a new version, besides each time you come back to it. */
export const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Register the service worker. When a new version has installed and is waiting, `onUpdate` gets a function that
 * hands over to it and reloads, for the "A new version is ready" Reload. Nothing reloads by itself.
 *
 * It looks for a new version as the app starts, each time you come back to it (an installed app's window is often
 * left open for days, and moving between steps never reloads the page), and every hour while it's open. Returns a
 * function that stops looking (the app calls it when it goes; tests unmount it).
 */
export const registerServiceWorker = async (
    onUpdate: (reload: () => void) => void,
    allowed = serviceWorkerAllowed(),
): Promise<() => void> => {
    if (!allowed) return () => {};
    const worker = navigator.serviceWorker;
    // the build writes the version into sw.js, so a new deploy is a changed file
    const registration = await worker.register('sw.js');
    const check = () =>
        registration.update().catch(() => {
            // offline: the kept version carries on
        });
    void check();
    const onShow = () => {
        if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onShow);
    const hourly = setInterval(() => void check(), UPDATE_CHECK_MS);
    const stop = () => {
        document.removeEventListener('visibilitychange', onShow);
        clearInterval(hourly);
    };
    const offer = (waiting: ServiceWorker) =>
        onUpdate(() => {
            worker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
            waiting.postMessage('skip-waiting');
        });
    // only an update counts: the very first install has nothing to replace
    if (registration.waiting && worker.controller) offer(registration.waiting);
    registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
            if (installing.state === 'installed' && worker.controller) offer(installing);
        });
    });
    return stop;
};

/** The browser's offer to install, held until ☰ uses it (it can arrive before the menu is first opened). */
export interface InstallPrompt extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let offered: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((listen) => listen());

/** Whether the app is running installed, in its own window. */
export const installed = () =>
    !!window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** An iPhone or iPad (iPadOS reports itself as a Mac with touch), where a page can't start the install. */
export const isAppleMobile = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Ask the browser to keep this site's storage (the image and settings), once the app is installed. */
export const keepStorage = () => navigator.storage?.persist?.().catch(() => false);

/** Listen for the browser's install offer, and for the app being installed; call once, as the app starts. */
export const watchInstall = () => {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        offered = event as InstallPrompt;
        changed();
    });
    window.addEventListener('appinstalled', () => {
        offered = null;
        keepStorage();
        changed();
    });
    if (installed()) keepStorage();
};

export const installOffer = () => offered;

/** Show the browser's install dialog; the offer is used up either way. */
export const install = async () => {
    const prompt = offered;
    offered = null;
    changed();
    if (prompt) await prompt.prompt();
};

export const onInstallChange = (listen: () => void) => {
    listeners.add(listen);
    return () => {
        listeners.delete(listen);
    };
};
