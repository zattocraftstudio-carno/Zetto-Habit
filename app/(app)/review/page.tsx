import React from 'react';
import Link from 'next/link';
import { getHabits } from '@/actions/habits';
import { getHabitLogsForRange } from '@/actions/habitLogs';
import { getPreferences } from '@/actions/preferences';
import { getAppTodayStr, parseDate, formatDate, isLogCompleted } from '@/lib/streaks';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ReviewClient } from '@/components/ReviewClient';
import { Habit } from '@/types';

export interface WeekRow {
  id: string;
  name: string;
  thisWeek: number;
  lastWeek: number;
  trend: 'up' | 'down' | 'same';
}

export default async function ReviewPage() {
  const prefsRes = await getPreferences();
  const prefs = prefsRes.success ? prefsRes.data : null;
  const bn = (prefs?.language ?? 'bn') === 'bn';
  const todayStr = getAppTodayStr(prefs?.dayStartHour ?? 0);

  const habitsRes = await getHabits();
  const habits = (habitsRes.success ? habitsRes.data : []).filter((h: Habit) => !h.archived);

  const today = parseDate(todayStr);
  const startThis = new Date(today);
  startThis.setDate(today.getDate() - 6);
  const startLast = new Date(today);
  startLast.setDate(today.getDate() - 13);
  const endLast = new Date(today);
  endLast.setDate(today.getDate() - 7);

  const logsRes = await getHabitLogsForRange(formatDate(startLast), todayStr);
  const logs = logsRes.success ? logsRes.data : [];

  const inRange = (d: string, a: string, b: string) => d >= a && d <= b;
  const thisStart = formatDate(startThis);
  const lastStart = formatDate(startLast);
  const lastEnd = formatDate(endLast);

  const rows: WeekRow[] = habits.map((h) => {
    const thisWeek = logs.filter(
      (l) => l.habit_id === h.id && inRange(l.log_date, thisStart, todayStr) && isLogCompleted(h, l)
    ).length;
    const lastWeek = logs.filter(
      (l) => l.habit_id === h.id && inRange(l.log_date, lastStart, lastEnd) && isLogCompleted(h, l)
    ).length;
    return {
      id: h.id,
      name: h.name,
      thisWeek,
      lastWeek,
      trend: thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'same',
    };
  });

  const totalThis = rows.reduce((s, r) => s + r.thisWeek, 0);
  const totalLast = rows.reduce((s, r) => s + r.lastWeek, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {bn ? 'সাপ্তাহিক রিভিউ' : 'Weekly Review'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {thisStart} → {todayStr}
            {totalThis >= totalLast ? ' 🎉' : ''}
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="secondary" size="sm">{bn ? 'ড্যাশবোর্ড' : 'Dashboard'}</Button>
        </Link>
      </div>

      <Card padding="md">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3 rounded bg-[var(--color-missed)]/15">
            <div className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">{totalThis}</div>
            <div className="text-[11px] text-[var(--color-text-secondary)]">{bn ? 'এই সপ্তাহে সম্পূর্ণ' : 'Completed this week'}</div>
          </div>
          <div className="p-3 rounded bg-[var(--color-missed)]/15">
            <div className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">
              {totalThis - totalLast >= 0 ? `+${totalThis - totalLast}` : totalThis - totalLast}
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)]">{bn ? 'গত সপ্তাহের তুলনায়' : 'vs last week'}</div>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-3">
          {bn ? 'Habit তুলনা' : 'Habit comparison'}
        </h2>
        {rows.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)] text-center py-6">
            {bn ? 'কোনো habit নেই।' : 'No habits yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  <th className="py-2 px-2">Habit</th>
                  <th className="py-2 px-2 text-center">{bn ? 'গত সপ্তাহ' : 'Last'}</th>
                  <th className="py-2 px-2 text-center">{bn ? 'এই সপ্তাহ' : 'This'}</th>
                  <th className="py-2 px-2 text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-2 font-semibold">{r.name}</td>
                    <td className="py-2 px-2 text-center tabular-nums">{r.lastWeek}</td>
                    <td className="py-2 px-2 text-center tabular-nums font-bold text-[var(--color-primary)]">{r.thisWeek}</td>
                    <td className="py-2 px-2 text-center">
                      {r.trend === 'up' ? '📈' : r.trend === 'down' ? '📉' : '➖'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ReviewClient
        weekLabel={`${lastStart} → ${todayStr}`}
        summary={rows.map((r) => `${r.name}: last=${r.lastWeek}, this=${r.thisWeek}`).join('; ')}
        bn={bn}
      />
    </div>
  );
}
