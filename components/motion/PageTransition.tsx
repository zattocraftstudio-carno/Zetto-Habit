'use client';

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  DUR,
  EASE,
  NavDirection,
  consumePendingDirection,
  directionBetween,
} from '@/lib/motion';

const DISTANCE = 18; // px — subtle, native-feeling, not a slideshow

/**
 * Layout-level page transition (PRD: no per-page code).
 *
 * Slide + fade between the 5 bottom-nav tabs, with the direction derived from
 * the tab order, so moving to a tab on the right slides in from the right and
 * vice-versa. Non-tab navigations fade in place.
 *
 * Note: we animate a keyed wrapper around `children`. Because App Router pages
 * re-render on navigation we use `mode="popLayout"`-free sync behaviour (no
 * exit delay) so nothing is ever blocked or left blank.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const dirRef = useRef<NavDirection>(0);
  const prevRef = useRef<string>(pathname);

  // Record direction before render: explicit intent wins, else infer from order
  if (prevRef.current !== pathname) {
    const pending = consumePendingDirection();
    dirRef.current = pending !== 0 ? pending : directionBetween(prevRef.current, pathname);
    prevRef.current = pathname;
  }

  const dir = dirRef.current;
  const fromX = dir === 1 ? DISTANCE : dir === -1 ? -DISTANCE : 0;

  return (
    <AnimatePresence initial={false} mode="sync">
      <motion.div
        key={pathname}
        initial={
          reduced
            ? { opacity: 1 }
            : { opacity: 0, x: fromX }
        }
        animate={{ opacity: 1, x: 0 }}
        transition={
          reduced
            ? { duration: 0.001 }
            : { duration: DUR.page, ease: EASE.out }
        }
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
