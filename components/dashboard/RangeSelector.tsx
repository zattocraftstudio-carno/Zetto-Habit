'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RangeKey } from '@/lib/analytics';
import { usePrefs } from '@/components/PrefsProvider';

const PRESETS: { key: RangeKey; label: string; labelBn: string }[] = [
  { key: 'week', label: 'Week', labelBn: 'সপ্তাহ' },
  { key: 'month', label: 'Month', labelBn: 'মাস' },
  { key: 'quarter', label: '3 Months', labelBn: '৩ মাস' },
  { key: 'year', label: 'Year', labelBn: 'বছর' },
];

export function RangeSelector({ initial }: { initial: RangeKey }) {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const [isPending, startTransition] = useTransition();
  const [key, setKey] = useState<RangeKey>(initial);
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState(params.get('from') || '');
  const [to, setTo] = useState(params.get('to') || '');

  const apply = (nextKey: RangeKey, start?: string, end?: string) => {
    setKey(nextKey);
    const sp = new URLSearchParams(params.toString());
    if (nextKey === 'custom') {
      sp.set('range', 'custom');
      if (start) sp.set('from', start);
      if (end) sp.set('to', end);
    } else {
      sp.set('range', nextKey);
      sp.delete('from');
      sp.delete('to');
    }
    startTransition(() => {
      router.push(`/dashboard?${sp.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Time range">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          disabled={isPending}
          onClick={() => {
            setCustom(false);
            apply(p.key);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
            key === p.key && !custom
              ? 'bg-[var(--color-primary)] text-white'
              : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          {bn ? p.labelBn : p.label}
        </button>
      ))}
      <button
        disabled={isPending}
        onClick={() => {
          setCustom(true);
          apply('custom', from, to);
        }}
        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors disabled:opacity-50 ${
          custom
            ? 'bg-[var(--color-primary)] text-white'
            : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
        }`}
      >
        {bn ? 'কাস্টম' : 'Custom'}
      </button>

      {custom && (
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="min-h-[36px] px-2 py-1 text-xs rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            aria-label={bn ? 'শুরুর তারিখ' : 'Start date'}
          />
          <span className="text-xs text-[var(--color-text-secondary)]">–</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="min-h-[36px] px-2 py-1 text-xs rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            aria-label={bn ? 'শেষের তারিখ' : 'End date'}
          />
          <button
            disabled={isPending || !from || !to}
            onClick={() => apply('custom', from, to)}
            className="px-2.5 py-1.5 rounded text-xs font-bold bg-[var(--color-primary)] text-white disabled:opacity-40"
          >
            {bn ? 'প্রয়োগ' : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
}
