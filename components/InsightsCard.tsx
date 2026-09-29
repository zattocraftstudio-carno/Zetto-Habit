'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Habit, HabitLog } from '@/types';
import { parseDate, formatDate, isLogCompleted } from '@/lib/streaks';
import { Card } from '@/components/ui/Card';
import { HabitIcon, FlameIcon } from '@/components/icons';

type Ranked = Habit & { currentStreak: number; longestStreak: number; completionRate: number };

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

function milestoneFor(longest: number): { label: string; days: number } | null {
  if (longest >= 100) return { label: '১০০ দিন', days: 100 };
  if (longest >= 30) return { label: '৩০ দিন', days: 30 };
  if (longest >= 7) return { label: '৭ দিন', days: 7 };
  return null;
}

export function InsightsCard({
  habits,
  logs,
  todayStr,
}: {
  habits: Ranked[];
  logs: HabitLog[];
  todayStr: string;
}) {
  const insights = useMemo(() => {
    if (habits.length === 0) return null;

    // Best weekday over last 30 days
    const today = parseDate(todayStr);
    const occ = [0, 0, 0, 0, 0, 0, 0];
    const done = [0, 0, 0, 0, 0, 0, 0];
    const byDate = new Map<string, HabitLog[]>();
    for (const l of logs) {
      if (!byDate.has(l.log_date)) byDate.set(l.log_date, []);
      byDate.get(l.log_date)!.push(l);
    }
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const wd = d.getDay();
      occ[wd]++;
      const dayLogs = byDate.get(formatDate(d)) || [];
      for (const h of habits) {
        const log = dayLogs.find((l) => l.habit_id === h.id);
        if (log && isLogCompleted(h, log)) done[wd]++;
      }
    }
    let best = 0;
    for (let w = 1; w < 7; w++) {
      const r = (n: number) => (occ[n] * habits.length > 0 ? done[n] / (occ[n] * habits.length) : 0);
      if (r(w) > r(best)) best = w;
    }

    const sorted = [...habits].sort((a, b) => b.completionRate - a.completionRate);
    const most = sorted[0];
    const weak = [...habits]
      .filter((h) => h.currentStreak === 0)
      .sort((a, b) => a.completionRate - b.completionRate)[0];

    const milestones = habits
      .map((h) => ({ habit: h, m: milestoneFor(h.longestStreak) }))
      .filter((x) => x.m !== null)
      .sort((a, b) => b.m!.days - a.m!.days)
      .slice(0, 6);

    return { best, most, weak, milestones };
  }, [habits, logs, todayStr]);

  if (!insights) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          স্বয়ংক্রিয় ইনসাইট
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mb-3">গত ৩০ দিনের ডেটা থেকে</p>
        <ul className="space-y-2.5 text-sm">
          <li className="flex gap-2">
            <span>📅</span>
            <span>
              আপনার সবচেয়ে ভালো দিন: <strong className="text-[var(--color-primary)]">{WEEKDAYS[insights.best]}বার</strong>
            </span>
          </li>
          <li className="flex gap-2">
            <span>🏆</span>
            <span>
              সবচেয়ে টেকসই: <strong>{insights.most.name}</strong> ({insights.most.completionRate}%)
            </span>
          </li>
          {insights.weak && (
            <li className="flex gap-2">
              <span>⚠️</span>
              <span>
                মনোযোগ দরকার: <strong>{insights.weak.name}</strong> ({insights.weak.completionRate}%, streak ভাঙা)
              </span>
            </li>
          )}
        </ul>
      </Card>

      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          Milestone ব্যাজ
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mb-3">শান্তভাবে উদযাপন করুন</p>
        {insights.milestones.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)] py-4 text-center">
            ৭ দিনের streak হলেই প্রথম ব্যাজ পাবেন। লেগে থাকুন!
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {insights.milestones.map(({ habit, m }) => (
              <Link
                key={habit.id}
                href={`/track/${habit.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/15"
              >
                <FlameIcon size={14} />
                <HabitIcon iconKey={habit.icon_svg} size={14} />
                <span>{habit.name} • {m!.label}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
