'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PageTransition } from '@/components/motion/PageTransition';
import { setPendingDirection } from '@/lib/motion';

/**
 * Native-style page transitions + custom pull-to-refresh.
 *
 * Pull-to-refresh: the browser's own overscroll bounce is suppressed with
 * `overscroll-behavior-y: contain` (see globals.css), and we drive our own
 * indicator + router.refresh() instead.
 *
 * Swipe: horizontal swipe anywhere in the main content area navigates between
 * the 5 top-level tabs (mirrors the native bottom-tab behaviour).
 */
const TAB_ORDER = ['/home', '/dashboard', '/add-habit', '/track', '/settings'];

export function NativeShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [pull, setPull] = useState(0); // 0..100 px
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const axisLocked = useRef<'y' | 'x' | null>(null);
  const swipedAt = useRef(0);

  // --- custom pull-to-refresh --------------------------------------------
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const t = e.touches[0];
    startY.current = t.clientY;
    startX.current = t.clientX;
    axisLocked.current = null;
  }, [refreshing]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startY.current === null || startX.current === null) return;
      const t = e.touches[0];
      const dy = t.clientY - startY.current;
      const dx = t.clientX - startX.current;

      // Lock to an axis so vertical scrolling never turns into a swipe
      if (!axisLocked.current && (Math.abs(dy) > 8 || Math.abs(dx) > 8)) {
        axisLocked.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      }

      if (axisLocked.current !== 'y') return;
      // Only pull when already at the very top
      if (window.scrollY > 2 || dy < 0) {
        if (pull !== 0) setPull(0);
        return;
      }
      // Rubber-band: resistance grows with distance
      const next = Math.min(96, dy * 0.45);
      setPull(next);
      if (next > 0 && e.cancelable) e.preventDefault();
    },
    [pull]
  );

  const onTouchEnd = useCallback(() => {
    const wasX = axisLocked.current === 'x';
    const endX = startX.current;
    startY.current = null;
    startX.current = null;
    axisLocked.current = null;

    if (wasX && endX !== null) {
      // recorded for the swipe handler below via lastX
      // (no-op: horizontal nav handled in onTouchEnd of wrapper below)
    }

    if (pull >= 64) {
      setRefreshing(true);
      setPull(64);
      router.refresh();
      setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 700);
    } else {
      setPull(0);
    }
  }, [pull, router]);

  // --- horizontal swipe between tabs --------------------------------------
  useEffect(() => {
    const el = document.getElementById('native-content');
    if (!el) return;

    let sx = 0;
    let sy = 0;
    let locked: 'x' | 'y' | null = null;
    let fired = false;

    const down = (e: TouchEvent) => {
      if (refreshing) return;
      const t = e.touches[0];
      sx = t.clientX;
      sy = t.clientY;
      locked = null;
      fired = false;
    };
    const move = (e: TouchEvent) => {
      const t = e.touches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      if (!locked && (Math.abs(dx) > 12 || Math.abs(dy) > 12)) {
        locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (locked === 'x' && e.cancelable) e.preventDefault();
    };
    const up = (e: TouchEvent) => {
      if (locked !== 'x' || fired) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      if (Math.abs(dx) < 70) return;
      fired = true;

      // Which tab are we in? /track/[id] counts as /track
      const current = TAB_ORDER.find((p) => pathname === p) ||
        (pathname.startsWith('/track') ? '/track' : null);
      if (!current) return;
      const i = TAB_ORDER.indexOf(current);
      const nextIdx = dx < 0 ? i + 1 : i - 1; // swipe left → forward
      if (nextIdx < 0 || nextIdx >= TAB_ORDER.length) return;
      swipedAt.current = Date.now();
      // tell the page transition which way to slide
      setPendingDirection(dx < 0 ? 1 : -1);
      router.push(TAB_ORDER[nextIdx]);
    };

    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', up, { passive: true });
    el.addEventListener('touchcancel', () => {
      locked = null;
    }, { passive: true });

    return () => {
      el.removeEventListener('touchstart', down);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', up);
    };
  }, [pathname, router, refreshing]);

  return (
    <div
      id="native-content"
      className="flex-1 flex flex-col min-w-0"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* pull-to-refresh indicator */}
      {(pull > 0 || refreshing) && (
        <div
          className="sticky top-0 z-40 flex items-center justify-center overflow-hidden"
          style={{ height: Math.max(pull, refreshing ? 40 : 0) }}
          aria-hidden="true"
        >
          <div
            className="w-7 h-7 rounded-full border-2 border-[var(--color-missed)] border-t-[var(--color-primary)]"
            style={{
              transform: `rotate(${pull * 6}deg)`,
              animation: refreshing ? 'spin 0.7s linear infinite' : undefined,
            }}
          />
        </div>
      )}

      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
