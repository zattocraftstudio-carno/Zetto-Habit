'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePrefs } from '@/components/PrefsProvider';
import { AnalyticsBundle } from '@/lib/analytics';

export function CorrelationCard({ data }: { data: AnalyticsBundle | null }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';

  if (!data) {
    return (
      <Card padding="md">
        <Skeleton height={18} width={200} />
        <div className="mt-3 space-y-2">
          <Skeleton height={16} />
          <Skeleton height={16} />
        </div>
      </Card>
    );
  }

  const c = data.correlation;

  if (!c) {
    return (
      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          🧠 {bn ? 'Habit ও Mood সম্পর্ক' : 'Habit × mood correlation'}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] py-6 text-center">
          {bn
            ? 'এই ইনসাইট পেতে কমপক্ষে ৫ দিনের mood লগ ও habit-এর সাথে overlap দিন।'
            : 'Log mood on at least 5 days alongside a habit to unlock this insight.'}
        </p>
      </Card>
    );
  }

  const up = c.deltaPct >= 0;

  return (
    <Card padding="md">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        🧠 {bn ? 'Habit ও Mood সম্পর্ক' : 'Habit × mood correlation'}
      </h2>
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
        {bn ? 'স্বয়ংক্রিয়ভাবে হিসাব করা' : 'Automatically derived from your data'}
      </p>
      <div className="p-3 rounded-lg bg-[var(--color-missed)]/20 border border-[var(--color-border)]">
        <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">
          {bn ? (
            <>
              যেদিন <strong>{c.habitName}</strong> করেছেন, সেদিন আপনার mood গড়ে{' '}
              <strong className={up ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'}>
                {up ? `${c.deltaPct}% ভালো` : `${Math.abs(c.deltaPct)}% খারাপ`}
              </strong>{' '}
              ছিল।
            </>
          ) : (
            <>
              On days you did <strong>{c.habitName}</strong>, your mood was on average{' '}
              <strong className={up ? 'text-[var(--color-primary)]' : 'text-[var(--color-danger)]'}>
                {Math.abs(c.deltaPct)}% {up ? 'better' : 'worse'}
              </strong>
              .
            </>
          )}
        </p>
        <p className="text-[11px] text-[var(--color-text-secondary)] mt-2">
          {bn
            ? `${c.moodDays} দিনের mood ডেটার উপর ভিত্তি করে (${c.daysDone} দিন habit সম্পূর্ণ)`
            : `Based on ${c.moodDays} mood entries (${c.daysDone} days habit completed)`}
        </p>
      </div>
    </Card>
  );
}
