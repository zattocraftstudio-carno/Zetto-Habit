'use client';

import React, { useEffect, useState } from 'react';
import { usePrefs } from '@/components/PrefsProvider';

/**
 * Splash screen shown on cold start (standalone PWA launch).
 * Matches the manifest background_color so the hand-off is seamless.
 */
export function SplashScreen() {
  const { prefs } = usePrefs();
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Only on a real cold start, and only briefly
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  if (!isStandalone) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--color-bg)]"
      style={{ animation: 'splash-out 0.35s ease 0.75s forwards' }}
      aria-hidden="true"
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg animate-habit-pop"
        style={{ backgroundColor: prefs.accent || '#2E7D6B' }}
      >
        H
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--color-text-primary)]">
        HabitTracker
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
        {prefs.language === 'bn' ? 'দৈনিক অভ্যাস ট্র্যাকার' : 'Daily habit tracker'}
      </p>
      <div className="mt-5 w-32 h-1 rounded bg-[var(--color-missed)] overflow-hidden">
        <div
          className="h-full bg-[var(--color-primary)] rounded"
          style={{ animation: 'splash-bar 0.8s ease forwards' }}
        />
      </div>
    </div>
  );
}
