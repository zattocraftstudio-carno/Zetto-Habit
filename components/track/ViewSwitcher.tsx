'use client';

import React from 'react';
import { usePrefs } from '@/components/PrefsProvider';

export type TrackView = 'month' | 'week' | 'year';

export function ViewSwitcher({
  view,
  onChange,
}: {
  view: TrackView;
  onChange: (v: TrackView) => void;
}) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const tabs: { id: TrackView; label: string }[] = [
    { id: 'month', label: bn ? 'মাস' : 'Month' },
    { id: 'week', label: bn ? 'সপ্তাহ' : 'Week' },
    { id: 'year', label: bn ? 'বছর' : 'Year' },
  ];
  return (
    <div
      className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 bg-[var(--color-card-bg)]"
      role="tablist"
      aria-label={bn ? 'ভিউ' : 'View'}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={view === t.id}
          onClick={() => onChange(t.id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            view === t.id
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
