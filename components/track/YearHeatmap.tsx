'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePrefs } from '@/components/PrefsProvider';
import { parseDate, formatDate } from '@/lib/streaks';

export interface YearCell {
  date: string;
  pct: number;
  done: boolean;
  due: boolean;
  note: boolean;
}

const MONTHS_BN = ['জা', 'ফে', 'মা', 'অ', 'মে', 'জু', 'জু', 'আ', 'সে', 'অ', 'ন', 'ডি'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_BN = ['র', 'সো', 'ম', 'বু', 'বৃ', 'শু', 'শ'];

export function YearHeatmap({
  year,
  data,
  onPick,
  onYearChange,
}: {
  year: number;
  data: YearCell[] | null;
  onPick: (date: string) => void;
  onYearChange: (y: number) => void;
}) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const [hover, setHover] = useState<YearCell | null>(null);
  const todayStr = formatDate(new Date());

  // Group into weeks (columns), Sunday-first
  const weeks = useMemo(() => {
    if (!data || data.length === 0) return [];
    const byDate = new Map(data.map((c) => [c.date, c]));
    const first = parseDate(data[0].date);
    const last = parseDate(data[data.length - 1].date);
    const cols: YearCell[][] = [];
    let col: YearCell[] = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      const ds = formatDate(d);
      const cell = byDate.get(ds);
      if (cell) col.push(cell);
      if (d.getDay() === 6 || ds === formatDate(last)) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length) cols.push(col);
    return cols;
  }, [data]);

  // Month labels positioned by first week that contains day 1
  const monthLabels = useMemo(() => {
    if (!data || data.length === 0) return [];
    const out: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((col, ci) => {
      const firstOfMonth = col.find((c) => parseDate(c.date).getDate() === 1);
      if (firstOfMonth) {
        const m = parseDate(firstOfMonth.date).getMonth();
        if (m !== lastMonth) {
          out.push({ col: ci, label: (bn ? MONTHS_BN : MONTHS_EN)[m] });
          lastMonth = m;
        }
      }
    });
    return out;
  }, [weeks, data, bn]);

  const opacityFor = (c: YearCell) => {
    if (!c.due) return 0.06;
    if (c.pct === 0) return 0.16;
    if (c.pct <= 33) return 0.4;
    if (c.pct <= 66) return 0.68;
    if (c.pct < 100) return 0.85;
    return 1;
  };

  const yearCount = data ? data.filter((c) => c.done).length : 0;
  const yearRate = data && data.length > 0 ? Math.round((yearCount / data.length) * 100) : 0;

  return (
    <Card padding="md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            🗓 {bn ? 'বাসির ছক্র' : 'Year heatmap'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {data
              ? `${year}: ${yearCount} ${bn ? 'দিন সম্পূর্ণ' : 'days done'} (${yearRate}%)`
              : bn ? 'লোড হচ্ছে...' : 'loading...'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onYearChange(year - 1)}
            className="px-2.5 py-1.5 rounded text-xs font-bold border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ←
          </button>
          <span className="text-sm font-bold tabular-nums min-w-[3rem] text-center">
            {year}
          </span>
          <button
            onClick={() => onYearChange(year + 1)}
            disabled={year >= new Date().getFullYear()}
            className="px-2.5 py-1.5 rounded text-xs font-bold border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      {!data ? (
        <Skeleton height={130} />
      ) : (
        <>
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[620px]">
              {/* month labels */}
              <div className="flex gap-[3px] pl-6 mb-1 h-3">
                {weeks.map((_, ci) => {
                  const lbl = monthLabels.find((m) => m.col === ci);
                  return (
                    <div key={ci} className="w-[11px] shrink-0 text-[9px] text-[var(--color-text-secondary)]">
                      {lbl ? lbl.label : ''}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-[3px]">
                {/* weekday labels */}
                <div className="flex flex-col gap-[3px] pr-1.5 shrink-0">
                  {[0, 2, 4, 6].map((i) => (
                    <div
                      key={i}
                      className="h-[11px] text-[9px] leading-[11px] text-[var(--color-text-secondary)]"
                    >
                      {bn ? DOW_BN[i] : ['S', 'T', 'T', 'F'][i === 0 ? 0 : i === 2 ? 2 : i === 4 ? 3 : 3]}
                    </div>
                  ))}
                </div>
                {/* weeks */}
                {weeks.map((col, ci) => (
                  <div key={ci} className="flex flex-col gap-[3px]">
                    {col.map((c) => (
                      <button
                        key={c.date}
                        onClick={() => c.due && onPick(c.date)}
                        onMouseEnter={() => setHover(c)}
                        onMouseLeave={() => setHover(null)}
                        disabled={!c.due}
                        className={`w-[11px] h-[11px] rounded-[2px] transition-transform hover:scale-150 ${
                          c.date === todayStr ? 'ring-1 ring-[var(--color-accent)]' : ''
                        } ${c.due ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{
                          backgroundColor:
                            !c.due
                              ? 'var(--color-missed)'
                              : c.pct === 0
                                ? 'var(--color-missed)'
                                : 'var(--color-primary)',
                          opacity: opacityFor(c),
                        }}
                        aria-label={`${c.date}: ${c.due ? (c.done ? 'done' : 'missed') : 'not due'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-3 text-xs">
            <span className="text-[var(--color-text-secondary)] truncate">
              {hover
                ? `${hover.date} · ${!hover.due ? (bn ? 'নির্ধারিত নয়' : 'not due') : hover.done ? `${hover.pct}%` : bn ? 'মিস' : 'missed'}${hover.note ? (bn ? ' · 📝' : ' · 📝') : ''}`
                : bn ? 'দিনের উপর মাউস রাখুন' : 'Hover a day'}
            </span>
            <div className="flex items-center gap-1 shrink-0 text-[10px] text-[var(--color-text-secondary)]">
              <span>{bn ? 'কম' : 'Less'}</span>
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--color-missed)] opacity-16" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--color-primary)] opacity-40" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--color-primary)] opacity-68" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--color-primary)]" />
              <span>{bn ? 'বেশি' : 'More'}</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
