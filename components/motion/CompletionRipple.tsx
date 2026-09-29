'use client';

import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

let seq = 0;

/**
 * A single radial ripple that expands from the exact click point.
 * Absolutely positioned inside the interactive element (position: relative).
 */
export function CompletionRipple({
  ripples,
  size,
  color = 'var(--color-primary)',
}: {
  ripples: Ripple[];
  size: number;
  color?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <>
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden="true"
            className="absolute pointer-events-none rounded-full"
            style={{
              left: r.x,
              top: r.y,
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              background: `radial-gradient(circle, ${color} 0%, ${color}55 45%, transparent 70%)`,
            }}
            initial={{ scale: 0.2, opacity: 0.55 }}
            animate={{ scale: 2.1, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={
              reduced
                ? { duration: 0.001 }
                : { duration: DUR.ripple, ease: EASE.out }
            }
            onAnimationComplete={() => {
              // nothing to clean: parent prunes the list on its own timer
            }}
          />
        ))}
      </AnimatePresence>
    </>
  );
}

export function nextRippleId() {
  seq += 1;
  return seq;
}
