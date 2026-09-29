/* Habit Tracker service worker — offline-capable app shell
 *
 * Strategy
 *  - Precache a small PUBLIC app shell on install (login + icons + offline page)
 *  - Navigations: network-first. Successful responses for private app pages are
 *    deliberately NOT written to the cache — see PRIVACY note below.
 *  - Static assets (/_next/static, icons, fonts): cache-first, but only when the
 *    server actually marked them cacheable (honours Cache-Control: no-store)
 *  - /api/* : NEVER cached — the offline outbox in lib/offlineQueue.ts handles writes
 *  - Bump CACHE_VERSION to invalidate everything on the next deploy
 *
 * PRIVACY
 *  Earlier versions cached every 200 navigation into SHELL_CACHE. That HTML
 *  contains the signed-in user's rendered habits, streaks and AI history, and it
 *  survived logout — so the next person to use the device while offline could be
 *  served the previous user's private pages. We now only ever cache the public
 *  shell, and logout() additionally purges every cache we own.
 */
const CACHE_VERSION = 'v4';
const SHELL_CACHE = `habit-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `habit-assets-${CACHE_VERSION}`;
const OWNED_CACHES = [SHELL_CACHE, ASSET_CACHE];

/** The only routes safe to persist: they render no user-specific data. */
const PUBLIC_SHELL = ['/login', '/offline', '/signup', '/forgot-password'];

const SHELL_ASSETS = [
  '/login',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
  '/offline',
];

/**
 * Write the public shell to disk.
 *
 * Fetched with `cache: 'reload'` and re-wrapped in a fresh Response before
 * `put`, because Next serves HTML with `Cache-Control: no-store` and some
 * browsers refuse to store a no-store response directly.
 *
 * Runs on BOTH install and activate: `install` only fires once per script
 * version, so a cache evicted later (storage pressure, "clear site data",
 * a manual purge) would otherwise never be rebuilt and offline support would
 * silently die.
 */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(
    SHELL_ASSETS.map(async (path) => {
      try {
        const res = await fetch(new Request(path, { cache: 'reload' }));
        if (!res.ok) return;
        const copy = new Response(await res.clone().blob(), {
          status: 200,
          headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' },
        });
        await cache.put(path, copy);
      } catch {
        // One missing asset must not abort the whole precache.
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precacheShell();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('habit-') && !OWNED_CACHES.includes(k)).map((k) => caches.delete(k))
      );
      // Self-heal: top the shell back up if it went missing.
      await precacheShell();
      await self.clients.claim();
    })()
  );
});

/** Called by the app on logout so no trace of the session survives. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'PURGE_CACHES') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith('habit-')).map((k) => caches.delete(k))
        );
      })()
    );
  }
});

/**
 * True only when the response is genuinely reusable. Dev servers send
 * `no-store` on JS chunks whose filenames are NOT content-hashed; caching those
 * would pin the browser to stale code until the cache name changed.
 */
function isCacheable(res) {
  if (!res || !res.ok) return false;
  const cc = res.headers.get('cache-control') || '';
  if (/no-store|no-cache/i.test(cc)) return false;
  return true;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/apple-touch-icon') ||
    url.pathname === '/sw.js' ||
    url.pathname === '/manifest.webmanifest'
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API traffic or RSC/action payloads
  if (url.pathname.startsWith('/api/')) return;
  if (request.headers.get('rsc') || request.headers.get('next-router-prefetch')) return;

  // Cache-first for immutable static assets
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (isCacheable(res)) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Network-first for navigations
  if (request.mode === 'navigate' || request.destination === 'document') {
    const isPublicShell = PUBLIC_SHELL.includes(url.pathname);
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Only the public shell is ever written to disk.
          if (isPublicShell && isCacheable(res)) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(async () => {
          // Offline. Replaying a cached *public* page is safe; replaying a
          // cached private page would leak the previous user's data.
          if (isPublicShell) {
            const cached = await caches.match(request);
            if (cached) return cached;
          }
          const offline = await caches.match('/offline');
          if (offline) return offline;
          const login = await caches.match('/login');
          if (login) return login;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
              '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
              '<h1>Offline</h1><p>Please reconnect to continue.</p>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
          );
        })
    );
    return;
  }

  // Everything else: network, fall back to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((hit) => hit || Response.error()))
  );
});
