'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface WeeklyStat {
  date: string;
  dayLabel: string;
  completionRate: number;
  completedCount: number;
  totalHabits: number;
}

export function WeeklyBarChart({ data }: { data: WeeklyStat[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="dayLabel"
            stroke="var(--color-text-secondary)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            domain={[0, 100]}
            stroke="var(--color-text-secondary)"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            unit="%"
          />
          <Tooltip
            cursor={{ fill: 'var(--color-missed)', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as WeeklyStat;
                return (
                  <div className="p-2 rounded bg-[var(--color-card-bg)] border border-[var(--color-border)] shadow-md text-xs">
                    <p className="font-semibold text-[var(--color-text-primary)]">{d.date}</p>
                    <p className="text-[var(--color-primary)]">
                      {d.completedCount} / {d.totalHabits} completed ({d.completionRate}%)
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="completionRate"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
