'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  DashboardIcon,
  PlusIcon,
  CalendarIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  LogoutIcon,
  BotIcon,
} from '@/components/icons';
import { useTheme } from '@/components/ThemeProvider';
import { usePrefs } from '@/components/PrefsProvider';
import { logout } from '@/actions/auth';
import { purgeSessionCaches } from '@/lib/purgeCaches';
import { useToast } from '@/components/ui/Toast';
import { AiChatPanel } from '@/components/AiChatPanel';
import { NativeShell } from '@/components/NativeShell';

interface AppShellProps {
  children: React.ReactNode;
  username: string;
}

const NAV_DEFS = [
  { href: '/home', key: 'nav.home', icon: 'home' },
  { href: '/dashboard', key: 'nav.dashboard', icon: 'dashboard' },
  { href: '/add-habit', key: 'nav.addHabit', icon: 'add' },
  { href: '/track', key: 'nav.track', icon: 'track' },
  { href: '/settings', key: 'nav.settings', icon: 'settings' },
] as const;

const NAV_ICONS = {
  home: HomeIcon,
  dashboard: DashboardIcon,
  add: PlusIcon,
  track: CalendarIcon,
  settings: SettingsIcon,
};

export function AppShell({ children, username }: AppShellProps) {
  const { t, lang } = usePrefs();
  const bn = lang === 'bn';
  const NAV_ITEMS = NAV_DEFS.map((d) => ({
    href: d.href,
    label: t(d.key as 'nav.home'),
    icon: NAV_ICONS[d.icon],
  }));
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Desktop keyboard shortcuts: N new habit, H home, D dashboard (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') router.push('/add-habit');
      else if (k === 'h') router.push('/home');
      else if (k === 'd') router.push('/dashboard');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  const handleLogout = async () => {
    const res = await logout();
    if (res.success) {
      // Drop the cached app shell so this device keeps no trace of the session.
      await purgeSessionCaches();
      toast('Logged out successfully', 'info');
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--color-bg)]">
      {/* Desktop Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-[var(--color-border)] bg-[var(--color-card-bg)] shrink-0 h-screen sticky top-0">
        {/* Brand / Logo */}
        <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg">
              H
            </div>
            <div>
              <span className="font-bold text-lg text-[var(--color-text-primary)]">HabitTracker</span>
              <p className="text-[11px] text-[var(--color-text-secondary)] -mt-1">Calm & Consistent</p>
            </div>
          </Link>
        </div>

        {/* Nav Items (fixed order) */}
        <nav className="flex-1 py-6 px-3 flex flex-col gap-1.5" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/track'
                ? pathname.startsWith('/track')
                : pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-l-4 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/20'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[var(--color-primary)]' : 'currentColor'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Assistant Quick Trigger */}
        <div className="px-3 pb-3">
          <button
            onClick={() => setIsAiOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-95 transition-opacity shadow-sm"
          >
            <BotIcon size={18} />
            <span>{bn ? 'AI হ্যাবিট কোচ' : 'AI Habit Coach'}</span>
          </button>
        </div>

        {/* User profile & footer */}
        <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
          <div className="flex flex-col truncate">
            <span className="text-xs text-[var(--color-text-secondary)]">{bn ? 'লগইন আছে' : 'Signed in as'}</span>
            <span className="text-sm font-semibold truncate text-[var(--color-text-primary)]">
              {username}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-missed)]/20"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-missed)]/20"
              aria-label="Log out"
              title="Log out"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile/Tablet Header (< 1024px) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-card-bg)] sticky top-0 z-30">
          <Link href="/home" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
              H
            </div>
            <span className="font-bold text-base text-[var(--color-text-primary)]">HabitTracker</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAiOpen(true)}
              className="p-2 rounded text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
              aria-label="Open AI Habit Coach"
              title="AI Habit Coach"
            >
              <BotIcon size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"
              aria-label="Log out"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </header>

        {/* Page Container — native transitions, swipe tabs, pull-to-refresh */}
        <NativeShell>{children}</NativeShell>

        {/* Mobile/Tablet Bottom Tab Bar (< 1024px) */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-card-bg)] border-t border-[var(--color-border)] flex items-center justify-around py-2 px-1"
          aria-label="Mobile Navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/track'
                ? pathname.startsWith('/track')
                : pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded min-w-[56px] transition-colors ${
                  isActive
                    ? 'border-t-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-[var(--color-primary)]' : 'currentColor'} />
                <span className="text-[11px] leading-tight truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Docked AI Habit Coach Panel */}
      <AiChatPanel isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
