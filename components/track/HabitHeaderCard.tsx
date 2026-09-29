'use client';

import React from 'react';
import Link from 'next/link';
import { Habit, HabitLog } from '@/types';
import { computeCurrentStreakWithGrace, computeLongestStreak, computeCompletionRate, isLogCompleted } from '@/lib/streaks';
import { Card } from '@/components/ui/Card';
import { HabitIcon, FlameIcon } from '@/components/icons';
import { usePrefs } from '@/components/PrefsProvider';

export function HabitHeaderCard({
  habit,
  logs,
  todayStr,
  graceDays,
}: {
  habit: Habit;
  logs: HabitLog[];
  todayStr: string;
  graceDays: number;
}) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const hl = logs.filter((l) => l.habit_id === habit.id);
  const current = computeCurrentStreakWithGrace(habit, hl, todayStr, graceDays);
  const longest = computeLongestStreak(habit, hl);
  const rate = computeCompletionRate(habit, hl, 30, todayStr);
  const totalDone = hl.filter((l) => isLogCompleted(habit, l)).length;

  const isQuantity = habit.goal_type === 'quantity';
  const target = Number(habit.target_value || 1);
  const todayLog = hl.find((l) => l.log_date === todayStr);
  const todayVal = Number(todayLog?.completed_value || 0);

  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, rate)) / 100) * circ;

  const freq =
    habit.frequency_type === 'daily'
      ? bn ? 'দৈনিক' : 'Daily'
      : habit.frequency_type === 'specific_days'
        ? bn ? 'নির্দিষ্ট দিন' : 'Specific days'
        : `${habit.frequency_target}×/${bn ? 'সপ্তাহ' : 'week'}`;

  return (
    <Card padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow"
            style={{ backgroundColor: habit.color || '#2E7D6B' }}
          >
            <HabitIcon iconKey={habit.icon_svg} size={28} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate text-[var(--color-text-primary)]">
              {habit.name}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {freq}
              {' • '}
              {isQuantity
                ? `${bn ? 'লক্ষ্য' : 'Target'}: ${target} ${habit.unit_label || ''}`
                : bn ? 'টিক লক্ষ্য' : 'Checkmark goal'}
              {habit.paused && (
                <span className="ml-1.5 font-semibold text-[#D97724]">⏸ {bn ? 'বন্ধ' : 'paused'}</span>
              )}
            </p>
          </div>
        </div>

        {/* Streaks */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center px-3 py-1.5 rounded-lg bg-[var(--color-missed)]/20">
            <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">
              {bn ? 'চলমান' : 'Current'}
            </p>
            <p className="text-base font-bold tabular-nums flex items-center gap-1">
              <FlameIcon size={15} className="text-[var(--color-accent)]" />
              {current}
            </p>
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-[var(--color-missed)]/20">
            <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">
              {bn ? 'সেরা' : 'Longest'}
            </p>
            <p className="text-base font-bold tabular-nums">{longest}</p>
          </div>
        </div>

        {/* Mini ring + today */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative" style={{ width: 60, height: 60 }}>
            <svg width={60} height={60} className="transform -rotate-90">
              <circle cx={30} cy={30} r={radius} fill="transparent" stroke="var(--color-missed)" strokeWidth={6} />
              <circle
                cx={30}
                cy={30}
                r={radius}
                fill="transparent"
                stroke="var(--color-primary)"
                strokeWidth={6}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums text-[var(--color-text-primary)]">
              {rate}%
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-wide">
              {bn ? '৩০ দিন' : '30-day'}
            </p>
            <p className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
              {isQuantity
                ? `${bn ? 'আজ' : 'today'}: ${todayVal}/${target}`
                : `${bn ? 'মোট' : 'total'}: ${totalDone}`}
            </p>
            <Link
              href="/track"
              className="text-[11px] text-[var(--color-primary)] hover:underline"
            >
              {bn ? 'সব habit' : 'All habits'} →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
