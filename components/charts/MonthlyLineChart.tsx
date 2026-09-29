'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface MonthlyStat {
  date: string;
  dayNumber: number;
  completionRate: number;
}

export function MonthlyLineChart({ data }: { data: MonthlyStat[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="dayNumber"
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
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload as MonthlyStat;
                return (
                  <div className="p-2 rounded bg-[var(--color-card-bg)] border border-[var(--color-border)] shadow-md text-xs">
                    <p className="font-semibold text-[var(--color-text-primary)]">{d.date}</p>
                    <p className="text-[var(--color-primary)]">{d.completionRate}% completion</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            dot={{ r: 2, fill: 'var(--color-primary)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
