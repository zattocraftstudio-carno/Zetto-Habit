'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Habit } from '@/types';
import { Card } from '@/components/ui/Card';
import { HabitIcon, FlameIcon } from '@/components/icons';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { usePrefs } from '@/components/PrefsProvider';

interface StreakRankingTableProps {
  habits: Array<
    Habit & {
      currentStreak: number;
      longestStreak: number;
      completionRate: number;
    }
  >;
}

export function StreakRankingTable({ habits }: StreakRankingTableProps) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const [sortField, setSortField] = useState<'currentStreak' | 'longestStreak' | 'completionRate'>('currentStreak');
  const [sortAsc, setSortAsc] = useState(false);

  const sortedHabits = [...habits].sort((a, b) => {
    let diff = 0;
    if (sortField === 'currentStreak') {
      diff = a.currentStreak - b.currentStreak;
    } else if (sortField === 'longestStreak') {
      diff = a.longestStreak - b.longestStreak;
    } else if (sortField === 'completionRate') {
      diff = a.completionRate - b.completionRate;
    }

    if (diff !== 0) {
      return sortAsc ? diff : -diff;
    }
    // Secondary sort by habit name
    return a.name.localeCompare(b.name);
  });

  const handleSort = (field: 'currentStreak' | 'longestStreak' | 'completionRate') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <Card padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {bn ? 'Streak তালিকা' : 'Streak Leaderboard'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn ? 'ধারাবাহিকতা অনুযায়ী ranking' : 'All your habits ranked by consecutive consistency'}
          </p>
        </div>
      </div>

      {sortedHabits.length === 0 ? (
        <div className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
          {bn ? 'এখনো habit নেই।' : 'No habits created yet.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)] font-medium">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Habit</th>
                <th className="py-2.5 px-3">Category</th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('currentStreak')}
                >
                  Current Streak {sortField === 'currentStreak' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('longestStreak')}
                >
                  Best Streak {sortField === 'longestStreak' && (sortAsc ? '▲' : '▼')}
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-[var(--color-primary)] select-none"
                  onClick={() => handleSort('completionRate')}
                >
                  30-Day Rate {sortField === 'completionRate' && (sortAsc ? '▲' : '▼')}
                </th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sortedHabits.map((habit, index) => (
                <tr key={habit.id} className="hover:bg-[var(--color-missed)]/10">
                  <td className="py-3 px-3 font-semibold text-[var(--color-text-secondary)] tabular-nums">
                    {index + 1}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 text-xs"
                        style={{ backgroundColor: habit.color || 'var(--color-primary)' }}
                      >
                        <HabitIcon iconKey={habit.icon_svg} size={14} className="text-white" />
                      </div>
                      <Link
                        href={`/track/${habit.id}`}
                        className="font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] truncate max-w-xs"
                      >
                        {habit.name}
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 px-3 capitalize text-[var(--color-text-secondary)]">
                    {habit.category || 'General'}
                  </td>
                  <td className="py-3 px-3 font-semibold tabular-nums text-[var(--color-text-primary)]">
                    <StreakBadge streak={habit.currentStreak} />
                    {habit.currentStreak === 0 && <span className="text-[var(--color-text-secondary)]">0 days</span>}
                  </td>
                  <td className="py-3 px-3 tabular-nums font-medium text-[var(--color-text-secondary)]">
                    {habit.longestStreak} days
                  </td>
                  <td className="py-3 px-3 tabular-nums font-semibold text-[var(--color-primary)]">
                    {habit.completionRate}%
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/track/${habit.id}`}
                      className="text-xs font-semibold px-2.5 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                    >
                      Track
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
