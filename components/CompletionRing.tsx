'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { usePrefsSafe } from '@/components/PrefsProvider';
import { DUR, EASE } from '@/lib/motion';

interface CompletionRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export function CompletionRing({
  percentage,
  size = 120,
  strokeWidth = 10,
}: CompletionRingProps) {
  // Hook must be called unconditionally — a try/catch here would make the hook
  // order depend on whether the provider is mounted.
  const ctx = usePrefsSafe();
  const bn = (ctx?.lang ?? 'bn') !== 'en';
  const reduced = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-missed)"
          strokeWidth={strokeWidth}
          className="transition-colors"
        />
        {/* Progress track — animates to the new value instead of jumping */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--color-primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={
            reduced
              ? { duration: 0.001 }
              : { duration: DUR.ring, ease: EASE.out }
          }
        />
      </svg>
      {/* Center percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] tabular-nums">
          {clamped}%
        </span>
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)] -mt-1">
          {bn ? 'আজ' : 'Today'}
        </span>
      </div>
    </div>
  );
}
