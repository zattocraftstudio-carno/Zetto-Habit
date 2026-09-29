'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePrefs } from '@/components/PrefsProvider';
import { AnalyticsBundle } from '@/lib/analytics';

const PALETTE = ['#2E7D6B', '#F4A259', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#64748B'];

export function CategoryDonut({ data }: { data: AnalyticsBundle | null }) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';

  if (!data) {
    return (
      <Card padding="md">
        <Skeleton height={18} width={180} />
        <div className="mt-3">
          <Skeleton height={200} />
        </div>
      </Card>
    );
  }

  const slices = data.categories.filter((c) => c.completed > 0);

  if (slices.length === 0) {
    return (
      <Card padding="md">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
          🗂️ {bn ? 'ক্যাটাগরি ভাগ' : 'Category breakdown'}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] py-6 text-center">
          {bn ? 'এই রেঞ্জে কোনো completion নেই।' : 'No completions in this range.'}
        </p>
      </Card>
    );
  }

  const total = slices.reduce((s, c) => s + c.completed, 0);

  return (
    <Card padding="md">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        🗂️ {bn ? 'ক্যাটাগরি ভাগ' : 'Category breakdown'}
      </h2>
      <p className="text-xs text-[var(--color-text-secondary)] mb-2">
        {bn ? 'কোন ক্যাটাগরিতে কত সময় যাচ্ছে' : 'Where your effort is going'}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="h-44 w-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="completed"
                nameKey="category"
                innerRadius={38}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
              >
                {slices.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload as (typeof slices)[number];
                  return (
                    <div className="p-2 rounded bg-[var(--color-card-bg)] border border-[var(--color-border)] shadow-md text-xs">
                      <p className="font-semibold capitalize">{d.category}</p>
                      <p>
                        {d.completed} {bn ? 'টি সম্পূর্ণ' : 'done'} · {d.habits}{' '}
                        {bn ? 'habit' : 'habits'}
                      </p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <ul className="flex-1 w-full space-y-1.5 text-xs">
          {slices.map((c, i) => (
            <li key={c.category} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
              />
              <span className="capitalize flex-1 truncate">{c.category}</span>
              <span className="tabular-nums text-[var(--color-text-secondary)]">
                {c.completed}/{total} ({c.share}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
