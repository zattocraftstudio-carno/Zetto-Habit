'use client';

import React from 'react';
import { OverviewStats } from '@/lib/analytics';
import { usePrefs } from '@/components/PrefsProvider';
import { Skeleton } from '@/components/ui/Skeleton';

export function StatCards({ data }: { data: OverviewStats | null }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={88} />
        ))}
      </div>
    );
  }

  const delta = data.weekDelta;
  const deltaText = `${delta > 0 ? '▲' : delta < 0 ? '▼' : '➖'} ${Math.abs(delta)}%`;

  const cards = [
    {
      emoji: '📋',
      label: bn ? 'মোট active habit' : 'Active habits',
      value: String(data.activeHabits),
      sub: '',
    },
    {
      emoji: '✅',
      label: bn ? 'আজকের completion' : "Today's completion",
      value: `${data.todayPct}%`,
      sub: '',
    },
    {
      emoji: '🔥',
      label: bn ? 'সবচেয়ে লম্বা streak' : 'Longest active streak',
      value: `${data.longestActiveStreak}d`,
      sub: data.longestStreakHabit || '',
    },
    {
      emoji: '📈',
      label: bn ? 'এই সপ্তাহের গড়' : 'This week avg',
      value: `${data.weekAvg}%`,
      sub: deltaText,
      subColor: delta > 0 ? 'text-[var(--color-primary)]' : delta < 0 ? 'text-[var(--color-danger)]' : '',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-bg)]"
        >
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            <span className="mr-1">{c.emoji}</span>
            {c.label}
          </p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-[var(--color-text-primary)] mt-1">
            {c.value}
          </p>
          {c.sub && (
            <p
              className={`text-[11px] font-semibold truncate ${c.subColor || 'text-[var(--color-text-secondary)]'}`}
              title={c.sub}
            >
              {c.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
