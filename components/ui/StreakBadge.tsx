import React from 'react';
import { FlameIcon } from '@/components/icons';

interface StreakBadgeProps {
  streak: number;
  className?: string;
}

export function StreakBadge({ streak, className = '' }: StreakBadgeProps) {
  if (streak <= 0) return null;

  // Scale accent at 7+ days
  const isHighStreak = streak >= 7;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none transition-colors ${
        isHighStreak
          ? 'bg-[var(--color-accent)]/20 text-[#D97724] dark:text-[#F4A259]'
          : 'bg-[var(--color-missed)]/40 text-[var(--color-text-secondary)]'
      } ${className}`}
      title={`${streak} day streak`}
      aria-label={`${streak} day streak`}
    >
      <FlameIcon size={14} className={isHighStreak ? 'text-[var(--color-accent)]' : 'currentColor'} />
      <span className="tabular-nums">{streak}</span>
    </div>
  );
}
