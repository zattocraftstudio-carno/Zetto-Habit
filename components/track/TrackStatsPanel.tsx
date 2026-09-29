'use client';

import React, { useMemo } from 'react';
import { Habit, HabitLog } from '@/types';
import { isLogCompleted, parseDate, formatDate } from '@/lib/streaks';
import { Card } from '@/components/ui/Card';
import { usePrefs } from '@/components/PrefsProvider';

export function TrackStatsPanel({
  habit,
  logs,
  monthStart,
  monthEnd,
  todayStr,
}: {
  habit: Habit;
  logs: HabitLog[];
  monthStart: string;
  monthEnd: string;
  todayStr: string;
}) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';

  const byDate = useMemo(() => {
    const m = new Map<string, HabitLog>();
    for (const l of logs) m.set(l.log_date, l);
    return m;
  }, [logs]);

  const isQuantity = habit.goal_type === 'quantity';
  const target = Number(habit.target_value || 1);

  // This month's stats
  const monthCells = useMemo(() => {
    const out: { date: string; due: boolean; done: boolean }[] = [];
    const a = parseDate(monthStart);
    const b = parseDate(monthEnd);
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      const ds = formatDate(d);
      let due = true;
      if (habit.frequency_type === 'specific_days' && habit.frequency_days) {
        due = habit.frequency_days.includes(d.getDay());
      }
      if (ds > todayStr) due = false;
      const log = byDate.get(ds);
      out.push({ date: ds, due, done: due && log ? isLogCompleted(habit, log) : false });
    }
    return out;
  }, [monthStart, monthEnd, todayStr, byDate, habit]);

  const dueCount = monthCells.filter((c) => c.due).length;
  const doneCount = monthCells.filter((c) => c.due && c.done).length;
  const monthPct = dueCount > 0 ? Math.round((doneCount / dueCount) * 100) : 0;

  // Best streak within the month
  let bestInMonth = 0;
  let run = 0;
  for (const c of monthCells) {
    if (!c.due) continue;
    if (c.done) {
      run++;
      if (run > bestInMonth) bestInMonth = run;
    } else run = 0;
  }

  const missed = Math.max(0, dueCount - doneCount);

  // 30-day sparkline values (0-100 per day)
  const spark = useMemo(() => {
    const out: { date: string; pct: number }[] = [];
    const today = parseDate(todayStr);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = formatDate(d);
      const log = byDate.get(ds);
      if (isQuantity && log) {
        out.push({ date: ds, pct: Math.min(100, Math.round((Number(log.completed_value || 0) / Math.max(1, target)) * 100)) });
      } else {
        out.push({ date: ds, pct: log && isLogCompleted(habit, log) ? 100 : 0 });
      }
    }
    return out;
  }, [todayStr, byDate, habit, isQuantity, target]);

  const maxSpark = Math.max(1, ...spark.map((s) => s.pct));

  const items = [
    {
      emoji: '📅',
      label: bn ? 'এই মাসের completion' : 'This month',
      value: `${monthPct}%`,
    },
    {
      emoji: '⚡',
      label: bn ? 'এই মাসে সেরা streak' : 'Best streak (month)',
      value: `${bestInMonth}d`,
    },
    {
      emoji: '✖️',
      label: bn ? 'মোট মিসড দিন' : 'Missed days',
      value: String(missed),
    },
  ];

  return (
    <Card padding="md" className="h-full">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
        {bn ? 'এই মাসের সারাংশ' : 'This month at a glance'}
      </h3>
      <ul className="space-y-2 mb-4">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-[var(--color-text-secondary)] truncate">
              <span className="mr-1">{i.emoji}</span>
              {i.label}
            </span>
            <span className="font-bold tabular-nums text-[var(--color-text-primary)]">{i.value}</span>
          </li>
        ))}
      </ul>

      <div className="pt-3 border-t border-[var(--color-border)]">
        <p className="text-[11px] text-[var(--color-text-secondary)] mb-1.5">
          {bn ? 'গত ৩০ দিনের trend' : 'Last 30 days trend'}
        </p>
        <div className="flex items-end gap-[2px] h-12" role="img" aria-label={bn ? '৩০ দিনের trend' : '30 day trend'}>
          {spark.map((s) => (
            <div
              key={s.date}
              title={`${s.date}: ${s.pct}%`}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(6, (s.pct / maxSpark) * 100)}%`,
                backgroundColor:
                  s.pct === 0 ? 'var(--color-missed)' : 'var(--color-primary)',
                opacity: s.pct === 0 ? 0.5 : 0.35 + (s.pct / 100) * 0.65,
              }}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
