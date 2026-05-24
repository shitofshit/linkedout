// Minimal pass-through service worker for PWA installability.
// Intentionally does NOT cache or intercept any requests — every fetch goes
// straight to the network. This avoids any chance of duplicate API calls or
// stale responses while still satisfying the installability criteria.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: let the browser handle the request normally.
});
