'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserPreferences, DEFAULT_PREFS, AppLanguage, ThemeChoice } from '@/types';
import { updatePreferences, getPreferences } from '@/actions/preferences';
import { bn, BnKeys } from '@/lib/i18n/bn';
import { en } from '@/lib/i18n/en';

const PREFS_STORAGE_KEY = 'habit_prefs_cache';

interface PrefsContextType {
  prefs: UserPreferences;
  lang: AppLanguage;
  t: (key: BnKeys) => string;
  update: (partial: Partial<UserPreferences>) => Promise<boolean>;
  refresh: () => Promise<void>;
  formatDate: (d: Date) => string;
  formatTime: (d: Date) => string;
  /** App-day string (YYYY-MM-DD) honoring dayStartHour cutoff */
  appToday: () => string;
}

const PrefsContext = createContext<PrefsContextType | undefined>(undefined);

function loadCached(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Record<string, unknown>;
      return {
        ...DEFAULT_PREFS,
        ...s,
        notifications: { ...DEFAULT_PREFS.notifications, ...((s.notifications as object) || {}) },
        ai: { ...DEFAULT_PREFS.ai, ...((s.ai as object) || {}) },
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

export type ResolvedTheme = 'light' | 'dark' | 'high-contrast';

/** Resolve a stored ThemeChoice into the theme actually painted. */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): ResolvedTheme {
  if (choice === 'high-contrast') return 'high-contrast';
  if (choice === 'dark') return 'dark';
  if (choice === 'light') return 'light';
  return systemDark ? 'dark' : 'light'; // 'system'
}

const THEME_COLORS: Record<ResolvedTheme, { theme: string; bg: string }> = {
  light: { theme: '#2E7D6B', bg: '#FAFAF7' },
  dark: { theme: '#3DA18B', bg: '#121714' },
  'high-contrast': { theme: '#00E5A0', bg: '#000000' },
};

function applyTheme(prefs: UserPreferences) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = resolveTheme(prefs.theme, systemDark);

  root.classList.toggle('dark', resolved === 'dark');
  root.classList.toggle('high-contrast', resolved === 'high-contrast');

  // Accent override only applies to themes that keep a tappable primary colour.
  // In high-contrast we keep the AAA-verified green so contrast stays guaranteed.
  if (prefs.accent && resolved !== 'high-contrast') {
    root.style.setProperty('--color-primary', prefs.accent);
  } else {
    root.style.removeProperty('--color-primary');
  }

  // Keep the mobile status bar / PWA theme colour in step with the active theme
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const t = prefs.accent && resolved !== 'high-contrast' ? prefs.accent : THEME_COLORS[resolved].theme;
    meta.setAttribute('content', t);
  }
}

export function PrefsProvider({
  children,
  initialPrefs,
}: {
  children: React.ReactNode;
  initialPrefs: UserPreferences | null;
}) {
  const [prefs, setPrefs] = useState<UserPreferences>(initialPrefs || DEFAULT_PREFS);

  // Instant paint from cache, then server truth when available
  useEffect(() => {
    if (!initialPrefs) setPrefs(loadCached());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTheme(prefs);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
  }, [prefs]);

  // Follow OS theme changes only when 'system' is selected
  useEffect(() => {
    if (prefs.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(prefs);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs]);

  const update = useCallback(async (partial: Partial<UserPreferences>) => {
    // Optimistic local update
    setPrefs((prev) => {
      const next = {
        ...prev,
        ...partial,
        notifications: { ...prev.notifications, ...(partial.notifications || {}) },
        ai: { ...prev.ai, ...(partial.ai || {}) },
      };
      return next;
    });
    try {
      const res = await updatePreferences(partial);
      if (res.success) {
        setPrefs(res.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const t = useCallback(
    (key: BnKeys) => (prefs.language === 'en' ? en[key] : bn[key]),
    [prefs.language]
  );

  // Re-fetch server truth (used after the AI agent changes settings)
  const refresh = useCallback(async () => {
    try {
      const res = await getPreferences();
      if (res.success) setPrefs(res.data);
    } catch {
      // keep local state
    }
  }, []);

  const formatDate = useCallback(
    (d: Date) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      if (prefs.dateFormat === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
      if (prefs.dateFormat === 'YYYY-MM-DD')
        return `${yyyy}-${mm}-${dd}`;
      return `${dd}/${mm}/${yyyy}`;
    },
    [prefs.dateFormat]
  );

  const formatTime = useCallback(
    (d: Date) => {
      const h = d.getHours();
      const m = String(d.getMinutes()).padStart(2, '0');
      if (!prefs.hour12) return `${String(h).padStart(2, '0')}:${m}`;
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m} ${suffix}`;
    },
    [prefs.hour12]
  );

  const appToday = useCallback(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(prefs.dayStartHour, 0, 0, 0);
    const appDay = now < cutoff ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
    const y = appDay.getFullYear();
    const m = String(appDay.getMonth() + 1).padStart(2, '0');
    const day = String(appDay.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [prefs.dayStartHour]);

  return (
    <PrefsContext.Provider
      value={{ prefs, lang: prefs.language, t, update, refresh, formatDate, formatTime, appToday }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}

/**
 * Non-throwing variant for components that must render outside the provider
 * (isolated previews, tests, embedded widgets).
 *
 * IMPORTANT: call this *unconditionally*. The hook slot is always consumed, so
 * wrapping the call in try/catch would violate the Rules of Hooks — if the
 * provider is missing on one render and present on the next, React throws
 * "Rendered more hooks than during the previous render".
 */
export function usePrefsSafe() {
  return useContext(PrefsContext);
}
