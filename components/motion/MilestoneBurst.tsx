'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BURST_COLORS, DUR, EASE } from '@/lib/motion';

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  spin: number;
}

let uid = 0;

/**
 * Localised milestone burst — deliberately NOT a fullscreen overlay.
 * 15–25 particles radiate from the badge, last under 1s, colours drawn only
 * from the primary/accent token palette.
 */
export function MilestoneBurst({
  active,
  origin,
  onDone,
  count = 20,
}: {
  active: boolean;
  /** badge centre, in viewport coordinates */
  origin: { x: number; y: number } | null;
  onDone: () => void;
  count?: number;
}) {
  const reduced = useReducedMotion();

  const particles = useMemo<Particle[]>(() => {
    const n = Math.max(15, Math.min(25, count));
    return Array.from({ length: n }, (_, i) => {
      // even angular spread with a small deterministic jitter, biased upward
      const base = (i / n) * Math.PI * 2;
      const jitter = ((i % 3) - 1) * 0.16;
      const angle = base + jitter - Math.PI / 2;
      return {
        id: uid++,
        angle,
        distance: 34 + ((i * 7) % 26),
        size: 3 + (i % 3),
        color: BURST_COLORS[i % BURST_COLORS.length],
        delay: (i % 5) * 0.012,
        spin: (i % 2 === 0 ? 1 : -1) * 120,
      };
    });
  }, [count]);

  if (!active || !origin) return null;

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!reduced) onDone();
        else onDone();
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[90]"
        style={{ left: origin.x, top: origin.y, width: 0, height: 0 }}
      >
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute rounded-[2px] block"
            style={{
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              marginLeft: -p.size / 2,
              marginTop: -(p.size * 1.6) / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{
              x: Math.cos(p.angle) * p.distance,
              y: Math.sin(p.angle) * p.distance,
              opacity: [0, 1, 1, 0],
              scale: [0.6, 1, 0.9],
              rotate: p.spin,
            }}
            transition={
              reduced
                ? { duration: 0.001 }
                : { duration: DUR.burst, delay: p.delay, ease: EASE.out, times: [0, 0.18, 0.7, 1] }
            }
          />
        ))}
      </div>
    </AnimatePresence>
  );
}
