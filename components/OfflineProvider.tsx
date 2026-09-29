'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/Toast';
import { pendingCount, syncOutbox } from '@/lib/offlineQueue';

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const doSync = useCallback(
    async (silent: boolean) => {
      if (pendingCount() === 0) {
        setPending(0);
        return;
      }
      const { synced, failed } = await syncOutbox();
      setPending(pendingCount());
      if (!silent && synced > 0) {
        toast(
          failed > 0
            ? `${synced} log synced, ${failed} failed`
            : `${synced} offline log${synced > 1 ? 's' : ''} synced ✓`,
          failed > 0 ? 'error' : 'success'
        );
      }
    },
    [toast]
  );

  useEffect(() => {
    // Register service worker for offline viewing
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // non-blocking
      });
    }
    setOnline(navigator.onLine);
    setPending(pendingCount());

    const onOnline = () => {
      setOnline(true);
      doSync(false);
    };
    const onOffline = () => setOnline(false);
    const onFocus = () => {
      if (navigator.onLine) doSync(true);
      setPending(pendingCount());
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onFocus);
    const timer = setInterval(() => setPending(pendingCount()), 5000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('focus', onFocus);
      clearInterval(timer);
    };
  }, [doSync]);

  return (
    <>
      {!online && (
        <div className="sticky top-0 z-40 px-4 py-2 text-center text-xs font-semibold bg-[var(--color-accent)]/20 text-[#D97724] dark:text-[#F4A259] border-b border-[var(--color-accent)]/30" role="status">
          অফলাইন — log গুলো সংরক্ষণ করে রাখা হবে, সংযোগ ফিরলে sync হবে
          {pending > 0 && ` (${pending})`}
        </div>
      )}
      {online && pending > 0 && (
        <button
          onClick={() => doSync(false)}
          className="sticky top-0 z-40 w-full px-4 py-2 text-center text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-b border-[var(--color-primary)]/20"
        >
          {pending}টি log sync বাকি — চাপুন
        </button>
      )}
      {children}
    </>
  );
}
