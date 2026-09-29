'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePrefs } from '@/components/PrefsProvider';
import { AnalyticsBundle, dayName } from '@/lib/analytics';

export function PatternCard({ data }: { data: AnalyticsBundle | null }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';

  if (!data) {
    return (
      <Card padding="md">
        <Skeleton height={18} width={180} />
        <div className="mt-3 space-y-2">
          <Skeleton height={16} />
          <Skeleton height={16} />
          <Skeleton height={16} />
        </div>
      </Card>
    );
  }

  const p = data.patterns;
  const hasAny =
    p.bestDayIndex >= 0 || p.worstDayIndex >= 0 || p.mostConsistent || p.mostMissed;

  return (
    <Card padding="md">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        🧭 {bn ? 'সেরা / সবচেয়ে খারাপ প্যাটার্ন' : 'Best / worst patterns'}
      </h2>
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
        {bn ? `গত ${data.range.days} দিনের ডেটা থেকে` : `From the last ${data.range.days} days`}
      </p>

      {!hasAny ? (
        <p className="text-xs text-[var(--color-text-secondary)] py-4 text-center">
          {bn ? 'যথেষ্ট ডেটা নেই।' : 'Not enough data yet.'}
        </p>
      ) : (
        <ul className="space-y-2.5 text-sm">
          {p.bestDayIndex >= 0 && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-text-secondary)]">
                {bn ? 'সবচেয়ে ভালো দিন' : 'Best day'}
              </span>
              <span className="font-semibold text-[var(--color-primary)]">
                {dayName(p.bestDayIndex, bn)}
                <span className="ml-1 tabular-nums">{p.bestDayPct}%</span>
              </span>
            </li>
          )}
          {p.worstDayIndex >= 0 && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-text-secondary)]">
                {bn ? 'সবচেয়ে খারাপ দিন' : 'Worst day'}
              </span>
              <span className="font-semibold text-[var(--color-danger)]">
                {dayName(p.worstDayIndex, bn)}
                <span className="ml-1 tabular-nums">{p.worstDayPct}%</span>
              </span>
            </li>
          )}
          {p.mostConsistent && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-text-secondary)]">
                {bn ? 'সবচেয়ে consistent habit' : 'Most consistent habit'}
              </span>
              <span className="font-semibold truncate max-w-[60%]">
                {p.mostConsistent.name}
                <span className="ml-1 tabular-nums text-[var(--color-primary)]">
                  {p.mostConsistent.rate}%
                </span>
              </span>
            </li>
          )}
          {p.mostMissed && (
            <li className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-text-secondary)]">
                {bn ? 'সবচেয়ে বেশি miss' : 'Most missed habit'}
              </span>
              <span className="font-semibold truncate max-w-[60%]">
                {p.mostMissed.name}
                <span className="ml-1 tabular-nums text-[var(--color-danger)]">
                  {p.mostMissed.missed}×
                </span>
              </span>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
