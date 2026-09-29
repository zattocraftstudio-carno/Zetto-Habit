'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { HabitIcon } from '@/components/icons';
import { Habit } from '@/types';

export type RankedHabit = Habit & {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
};

export function SuccessDonut({ habits }: { habits: RankedHabit[] }) {
  if (habits.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-[var(--color-text-secondary)]">
        No habits to display.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {habits.map((habit) => {
        const rate = habit.completionRate;
        const donutData = [
          { name: 'Completed', value: rate },
          { name: 'Remaining', value: Math.max(0, 100 - rate) },
        ];
        return (
          <div
            key={habit.id}
            className="flex flex-col items-center p-3 rounded bg-[var(--color-missed)]/10 border border-[var(--color-border)] text-center"
          >
            <div className="relative w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={26}
                    outerRadius={36}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell fill="var(--color-primary)" />
                    <Cell fill="var(--color-missed)" opacity={0.4} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-[var(--color-text-primary)]">
                {rate}%
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 max-w-full">
              <HabitIcon iconKey={habit.icon_svg} size={14} className="text-[var(--color-primary)] shrink-0" />
              <span className="text-xs font-semibold truncate text-[var(--color-text-primary)]">
                {habit.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
