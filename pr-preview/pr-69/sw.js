// Mosaic Creator's service worker: it keeps the app (one HTML file) and its icons, so the app opens with no
// connection. Everything else the app does happens on the device.
//
// The build writes the commit into VERSION (vite.config.ts), so each deploy changes this file: the browser checks it
// on every visit, installs the new worker with its own cache, and the new worker waits until the page asks it to take
// over ("A new version is ready", Reload). Nothing reloads by itself.

const VERSION = '085c9808fee83c83a388000cdf90f64d92a3fd20';
const CACHE = `mosaic-creator-${VERSION}`;
const APP = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP)));
});

self.addEventListener('message', (event) => {
    if (event.data === 'skip-waiting') self.skipWaiting();
});

// once in charge: drop older versions' caches, and look after the page that's already open
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith('mosaic-creator-') && key !== CACHE)
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

/** Whether a request is one of this app's own: not another site, and never a PR preview, which shares the path. */
const ours = (request) => {
    const url = new URL(request.url);
    const scope = new URL(self.registration.scope);
    return (
        request.method === 'GET' &&
        url.origin === scope.origin &&
        url.pathname.startsWith(scope.pathname) &&
        !url.pathname.includes('/pr-preview/')
    );
};

self.addEventListener('fetch', (event) => {
    if (!ours(event.request)) return;
    // opening the app (with any query or hash) gets the kept page; other files are kept as they are, else fetched
    const key = event.request.mode === 'navigate' ? './' : event.request;
    event.respondWith(
        caches
            .open(CACHE)
            .then((cache) => cache.match(key, { ignoreSearch: true }))
            .then((kept) => kept ?? fetch(event.request)),
    );
});
