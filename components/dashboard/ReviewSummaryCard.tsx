'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePrefs } from '@/components/PrefsProvider';
import { AnalyticsBundle } from '@/lib/analytics';
import { DashboardIcon } from '@/components/icons';

export function ReviewSummaryCard({ data }: { data: AnalyticsBundle | null }) {
  const { lang, prefs } = usePrefs();
  const bn = lang === 'bn';
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSummary = async () => {
    if (!data) return;
    setLoading(true);
    setError(null);
    const facts = [
      `range: ${data.range.start} to ${data.range.end}`,
      `today completion: ${data.overview.todayPct}%`,
      `week avg: ${data.overview.weekAvg}% (change ${data.overview.weekDelta} pts)`,
      `longest streak: ${data.overview.longestActiveStreak} days (${data.overview.longestStreakHabit || 'n/a'})`,
      data.patterns.bestDayIndex >= 0 ? `best weekday index: ${data.patterns.bestDayIndex}` : '',
      data.patterns.mostConsistent ? `most consistent: ${data.patterns.mostConsistent.name} ${data.patterns.mostConsistent.rate}%` : '',
      data.patterns.mostMissed ? `most missed: ${data.patterns.mostMissed.name}` : '',
      `total completions: ${data.totalCompletions}`,
    ]
      .filter(Boolean)
      .join('; ');

    const ask = bn
      ? `গত ${data.range.days} দিনের সারাংশ দাও (গত সপ্তাহের তুলনায়)। ডেটা: ${facts}। ৩-৪ বাক্যে কী ভালো হয়েছে, কী ঠিক করতে হবে।`
      : `Summarize the last ${data.range.days} days vs last week. Data: ${facts}. In 3-4 sentences: what went well, what to fix.`;

    try {
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: ask,
          model: 'auto',
          language: prefs.language,
          length: prefs.ai.replyLength,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'failed');
      setSummary(json.reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {bn ? '🤖 AI সাপ্তাহিক/মাসিক সারাংশ' : '🤖 AI weekly/monthly summary'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn ? 'বর্তমান রেঞ্জের ডেটা দেখে সংক্ষিপ্ত মন্তব্য' : 'Short commentary on the current range'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={getSummary}
          disabled={loading || !data}
          className="gap-1.5 shrink-0"
        >
          <DashboardIcon size={16} />
          <span>{loading ? (bn ? 'লোড হচ্ছে...' : 'Loading...') : bn ? 'সারাংশ নিন' : 'Get summary'}</span>
        </Button>
      </div>

      {error && <p className="text-xs text-[var(--color-danger)] mt-2">{error}</p>}
      {summary && (
        <p className="text-sm leading-relaxed text-[var(--color-text-primary)] mt-3 whitespace-pre-wrap border-t border-[var(--color-border)] pt-3">
          {summary}
        </p>
      )}
    </Card>
  );
}
