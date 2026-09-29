'use client';

/**
 * Best-effort cleanup of everything a signed-in session left on the device.
 *
 * The service worker caches the public app shell for offline use. Without an
 * explicit purge, a shared device could replay a cached page belonging to the
 * person who logged out last. `logout()` clears the auth cookie server-side, but
 * the browser-side caches are ours to remove.
 *
 * Never throws: a failed purge must not block the user from signing out.
 */
export async function purgeSessionCaches(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    // 1. Ask the active service worker to drop every cache it owns.
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          const worker = reg.active || reg.waiting || reg.installing;
          if (worker) worker.postMessage('PURGE_CACHES');
        })
      );
    }
    // 2. Also clear directly — covers the case where no SW is controlling the
    //    page yet, and guarantees the data is gone even if the message above
    //    has not been processed by the time we navigate away.
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('habit-')).map((k) => caches.delete(k))
      );
    }
  } catch {
    // Clipboard/storage restrictions or a browser without Cache API — the
    // cookie is already gone, which is the part that actually matters.
  }
}
