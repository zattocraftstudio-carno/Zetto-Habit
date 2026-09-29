'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePrefs } from '@/components/PrefsProvider';
import { AnalyticsBundle } from '@/lib/analytics';

const PALETTE = ['#2E7D6B', '#F4A259', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#C4554D'];

export function ComparisonChart({ data }: { data: AnalyticsBundle | null }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const habitIds = useMemo(() => (data ? Object.keys(data.perHabit) : []), [data]);
  const [selected, setSelected] = useState<string[]>([]);

  const active = useMemo(() => {
    if (!data) return [];
    if (selected.length > 0) return selected;
    return habitIds.slice(0, 3);
  }, [selected, data, habitIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const base = prev.length > 0 ? prev : habitIds.slice(0, 3);
      if (base.includes(id)) {
        const next = base.filter((x) => x !== id);
        return next;
      }
      if (base.length >= 4) return [...base.slice(1), id];
      return [...base, id];
    });
  };

  // Long ranges aggregate weekly so the line stays readable
  const bucketWeekly = data ? data.range.days > 45 : false;
  const rows = useMemo(() => {
    const out: Record<string, string | number>[] = [];
    if (!data) return out;
    const series = data.series;
    if (bucketWeekly) {
      for (let i = 0; i < series.length; i += 7) {
        const chunk = series.slice(i, i + 7);
        if (chunk.length === 0) continue;
        const row: Record<string, string | number> = { date: chunk[0].date };
        active.forEach((hid) => {
          const pts = data.perHabit[hid]?.points.slice(i, i + 7) || [];
          const done = pts.filter((p) => p.completed === 1).length;
          const due = pts.filter((p) => p.due === 1).length;
          row[hid] = due > 0 ? Math.round((done / due) * 100) : 0;
        });
        out.push(row);
      }
    } else {
      for (const c of series) {
        const row: Record<string, string | number> = { date: c.date.slice(5) };
        active.forEach((hid) => {
          const p = data.perHabit[hid]?.points.find((x) => x.date === c.date);
          row[hid] = p && p.due === 1 ? p.pct : 0;
        });
        out.push(row);
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, active, bucketWeekly]);

  // Hooks must all run before any early return, so the loading state lives here.
  if (!data) {
    return (
      <Card padding="md">
        <Skeleton height={18} width={220} />
        <div className="mt-3">
          <Skeleton height={256} />
        </div>
      </Card>
    );
  }

  if (habitIds.length === 0) {
    return (
      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {bn ? 'Habit তুলনা' : 'Habit comparison'}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] py-6 text-center">
          {bn ? 'তুলনা করার জন্য habit নেই।' : 'No habits to compare yet.'}
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
          {bn ? '📈 একাধিক habit তুলনা' : '📈 Multi-habit comparison'}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {bn
            ? 'কোন habit কত consistent — সব চিহ্নিত habit একসাথে (সর্বোচ্চ ৪টি)'
            : 'Compare consistency side by side (up to 4 selected)'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {habitIds.map((id) => {
          const h = data.perHabit[id];
          const on = active.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                on
                  ? 'text-white border-transparent'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              style={on ? { backgroundColor: h.color || '#2E7D6B' } : undefined}
            >
              {h.name}
            </button>
          );
        })}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
            <CartesianGrid
              stroke="var(--color-border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="var(--color-text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              minTickGap={18}
            />
            <YAxis
              domain={[0, 100]}
              stroke="var(--color-text-secondary)"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              unit="%"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="p-2 rounded bg-[var(--color-card-bg)] border border-[var(--color-border)] shadow-md text-xs">
                    <p className="font-semibold text-[var(--color-text-primary)] mb-1">{label}</p>
                    {payload.map((p, i) => (
                      <p key={i} style={{ color: p.color }} className="font-medium">
                        {p.name}: {p.value}%
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)' }}
            />
            {active.map((hid, i) => (
              <Line
                key={hid}
                type="monotone"
                dataKey={hid}
                name={data.perHabit[hid]?.name}
                stroke={data.perHabit[hid]?.color || PALETTE[i % PALETTE.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
