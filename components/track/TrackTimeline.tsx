'use client';

import React, { useMemo, useState } from 'react';
import { Habit, HabitLog } from '@/types';
import { isLogCompleted, parseDate } from '@/lib/streaks';
import { Card } from '@/components/ui/Card';
import { usePrefs } from '@/components/PrefsProvider';
import { PencilIcon } from '@/components/icons';

type Filter = 'all' | 'completed' | 'missed' | 'note';

/**
 * Pure "was this habit due on this date?" check.
 * Lives at module scope so `useMemo` can depend on it safely — defining it
 * inside the component recreated the function every render, which made it an
 * unstable (and missing) memo dependency.
 */
function dueOn(habit: Habit, date: string, todayStr: string): boolean {
  if (date > todayStr) return false; // never "due" in the future
  if (habit.frequency_type === 'specific_days' && habit.frequency_days) {
    return habit.frequency_days.includes(parseDate(date).getDay());
  }
  return true;
}

export function TrackTimeline({
  habit,
  logs,
  todayStr,
  onPick,
}: {
  habit: Habit;
  logs: HabitLog[];
  todayStr: string;
  onPick: (date: string) => void;
}) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const [filter, setFilter] = useState<Filter>('all');
  const isQuantity = habit.goal_type === 'quantity';
  const target = Number(habit.target_value || 1);

  // Build rows for the last 120 days (with entries or missed), newest first
  const rows = useMemo(() => {
    const byDate = new Map<string, HabitLog>();
    for (const l of logs) byDate.set(l.log_date, l);
    const out: {
      date: string;
      log?: HabitLog;
      done: boolean;
      due: boolean;
      pct: number;
    }[] = [];
    const today = parseDate(todayStr);
    for (let i = 0; i < 120; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const due = dueOn(habit, ds, todayStr);
      const log = byDate.get(ds);
      const done = due && log ? isLogCompleted(habit, log) : false;
      const pct =
        due && log && isQuantity
          ? Math.min(100, Math.round((Number(log.completed_value || 0) / Math.max(1, target)) * 100))
          : done
            ? 100
            : 0;
      if (!log && due) continue; // only show days that have a log or... keep all due days
      if (!log && !due) continue;
      out.push({ date: ds, log, done, due, pct });
    }
    return out;
  }, [logs, todayStr, habit, isQuantity, target]);

  const filtered = rows.filter((r) => {
    if (filter === 'completed') return r.done;
    if (filter === 'missed') return r.due && !r.done;
    if (filter === 'note') return !!(r.log && r.log.note);
    return true;
  });

  const FILTERS: { id: Filter; label: string; labelBn: string }[] = [
    { id: 'all', label: 'All', labelBn: 'সব' },
    { id: 'completed', label: 'Done', labelBn: 'সম্পূর্ণ' },
    { id: 'missed', label: 'Missed', labelBn: 'মিস' },
    { id: 'note', label: 'Has note', labelBn: 'নোট আছে' },
  ];

  return (
    <Card padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {bn ? '📜 টাইমলাইন' : '📜 Timeline'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn ? 'শেষ ১২০ দিন — click করে খুলুন' : 'Last 120 days — click a row to open'}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
            >
              {bn ? f.labelBn : f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-[var(--color-text-secondary)] text-center py-8">
          {bn ? 'এই ফিল্টারে কিছু নেই।' : 'Nothing matches this filter.'}
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {filtered.map((r) => (
            <li key={r.date}>
              <button
                onClick={() => onPick(r.date)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-missed)]/10 text-left transition-colors"
              >
                {/* visual scan bar */}
                <span
                  className="w-1.5 h-9 rounded-full shrink-0"
                  style={{
                    backgroundColor: r.done
                      ? 'var(--color-primary)'
                      : r.due
                        ? 'var(--color-missed)'
                        : 'transparent',
                    opacity: r.done ? 1 : 0.7,
                  }}
                />
                <span className="w-[86px] shrink-0 text-xs font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {r.date}
                </span>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    r.done
                      ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                      : 'bg-[var(--color-missed)]/40 text-[var(--color-text-secondary)]'
                  }`}
                >
                  {r.done
                    ? isQuantity
                      ? `${Math.round((r.pct * target) / 100)}/${target}`
                      : bn ? 'সম্পূর্ণ' : 'Done'
                    : bn ? 'মিস' : 'Missed'}
                </span>
                <span className="flex-1 text-xs text-[var(--color-text-secondary)] truncate">
                  {r.log?.note || (r.log?.completed_value && !r.done ? `${r.log.completed_value}/${target}` : '')}
                </span>
                <PencilIcon size={14} className="shrink-0 text-[var(--color-text-secondary)]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
