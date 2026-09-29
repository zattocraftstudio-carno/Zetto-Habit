'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Habit, HabitLog, MoodLog } from '@/types';
import { HabitIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, TrashIcon } from '@/components/icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';
import { useFeedback } from '@/components/FeedbackProvider';
import { isLogCompleted, parseDate, formatDate } from '@/lib/streaks';
import { saveLogWithQueue } from '@/lib/offlineQueue';
import { showRpgRewards } from '@/components/rpgRewards';
import { archiveHabit, setHabitPaused } from '@/actions/habits';
import { getYearHeatmap } from '@/actions/analytics';
import { HabitHeaderCard } from '@/components/track/HabitHeaderCard';
import { ViewSwitcher, TrackView } from '@/components/track/ViewSwitcher';
import { YearHeatmap, YearCell } from '@/components/track/YearHeatmap';
import { TrackStatsPanel } from '@/components/track/TrackStatsPanel';
import { TrackTimeline } from '@/components/track/TrackTimeline';
import { DayDetailModal } from '@/components/track/DayDetailModal';
import { StreakShareCard } from '@/components/StreakShareCard';

interface TrackHabitViewProps {
  habit: Habit;
  allHabits: Habit[];
  logs: HabitLog[];
  moods: MoodLog[];
  todayStr: string;
  graceDays: number;
}

export function TrackHabitView({
  habit,
  allHabits,
  logs,
  moods,
  todayStr,
  graceDays,
}: TrackHabitViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const { celebrate } = useFeedback();

  const [view, setView] = useState<TrackView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [pulseCell, setPulseCell] = useState<string | null>(null);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [yearCells, setYearCells] = useState<YearCell[] | null>(null);
  const [yearLoading, setYearLoading] = useState(false);

  const isQuantity = habit.goal_type === 'quantity';
  const target = Number(habit.target_value || 1);

  const logsMap = useMemo(() => {
    const m = new Map<string, HabitLog>();
    for (const l of logs) m.set(l.log_date, l);
    return m;
  }, [logs]);

  const moodMap = useMemo(() => {
    const m = new Map<string, MoodLog>();
    for (const x of moods) m.set(x.log_date, x);
    return m;
  }, [moods]);

  // --- Year heatmap is fetched only when the Year view is opened (own loading state)
  useEffect(() => {
    if (view !== 'year') return;
    let cancelled = false;
    setYearLoading(true);
    getYearHeatmap(year, habit.id, todayStr)
      .then((res) => {
        if (cancelled) return;
        setYearCells(res.success ? res.data.cells : []);
      })
      .catch(() => {
        if (!cancelled) setYearCells([]);
      })
      .finally(() => {
        if (!cancelled) setYearLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, year, habit.id, todayStr]);

  // --- Month math
  const year0 = cursor.getFullYear();
  const month0 = cursor.getMonth();
  const firstDay = new Date(year0, month0, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year0, month0 + 1, 0).getDate();
  const monthStart = formatDate(firstDay);
  const monthEnd = formatDate(new Date(year0, month0, daysInMonth));

  // --- Week view math (7 days ending today)
  const weekDays = useMemo(() => {
    const out: string[] = [];
    const t = parseDate(todayStr);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(t);
      d.setDate(t.getDate() - i);
      out.push(formatDate(d));
    }
    return out;
  }, [todayStr]);

  const shiftMonth = (delta: number) => {
    setCursor(new Date(year0, month0 + delta, 1));
  };

  const isDueOn = (dateStr: string) => {
    if (habit.frequency_type === 'specific_days' && habit.frequency_days) {
      return habit.frequency_days.includes(parseDate(dateStr).getDay());
    }
    return true;
  };

  const cellInfo = (dateStr: string) => {
    const log = logsMap.get(dateStr);
    const done = log ? isLogCompleted(habit, log) : false;
    const val = Number(log?.completed_value || 0);
    const pct = isQuantity
      ? Math.min(100, Math.round((val / Math.max(1, target)) * 100))
      : done
        ? 100
        : 0;
    return { log, done, val, pct };
  };

  const pick = (dateStr: string) => {
    if (dateStr > todayStr) return;
    setPulseCell(dateStr);
    setSelectedDate(dateStr);
  };

  const quickToggle = async (dateStr: string) => {
    const { done, val } = cellInfo(dateStr);
    const next = done ? 0 : isQuantity ? target : 1;
    const nextVal = isQuantity && !done && val > 0 && val < target ? target : next;
    const q = await saveLogWithQueue(habit.id, dateStr, nextVal, logsMap.get(dateStr)?.note || null);
    if (q.queued) {
      toast(bn ? 'অফলাইনে সেভ হয়েছে' : 'Saved offline', 'info');
    } else if (q.success) {
      if (nextVal >= (isQuantity ? target : 1)) celebrate();
      showRpgRewards(q.rpg, toast, bn);
    } else {
      toast(q.error || 'Failed', 'error');
    }
    router.refresh();
  };

  const onSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  const handlePause = async () => {
    setIsPausing(true);
    const res = await setHabitPaused(habit.id, !habit.paused);
    setIsPausing(false);
    if (res.success) {
      toast(bn ? (habit.paused ? 'চালু হয়েছে' : 'Pause হয়েছে') : (habit.paused ? 'Resumed' : 'Paused'), 'success');
      router.refresh();
    } else toast(res.error, 'error');
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    const res = await archiveHabit(habit.id);
    setIsArchiving(false);
    if (res.success) {
      toast(bn ? 'আর্কাইভ হয়েছে' : 'Archived', 'info');
      router.push('/track');
    } else toast(res.error, 'error');
  };

  const selectedLog = selectedDate ? logsMap.get(selectedDate) : null;
  const selectedMood = selectedDate ? moodMap.get(selectedDate) : null;

  return (
    <div className="space-y-6">
      <HabitHeaderCard habit={habit} logs={logs} todayStr={todayStr} graceDays={graceDays} />

      {/* Habit switcher + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {allHabits.map((h) => {
            const active = h.id === habit.id;
            return (
              <Link
                key={h.id}
                href={`/track/${h.id}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                  active
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-card-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                <HabitIcon iconKey={h.icon_svg} size={13} className={active ? 'text-white' : 'currentColor'} />
                <span>{h.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <StreakShareCard habit={habit} logs={logs} todayStr={todayStr} graceDays={graceDays} />
          <Button variant="secondary" size="sm" onClick={handlePause} disabled={isPausing} className="gap-1.5">
            <span>{habit.paused ? '▶' : '⏸'}</span>
            <span>{habit.paused ? (bn ? 'চালু' : 'Resume') : (bn ? 'Pause' : 'Pause')}</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsArchiveOpen(true)}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] gap-1.5"
          >
            <TrashIcon size={15} />
            <span>{bn ? 'আর্কাইভ' : 'Archive'}</span>
          </Button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center justify-between gap-2">
        <ViewSwitcher view={view} onChange={setView} />
        {view === 'month' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-1.5 rounded hover:bg-[var(--color-missed)]/30 text-[var(--color-text-secondary)]"
              aria-label={bn ? 'আগের মাস' : 'Previous month'}
            >
              <ChevronLeftIcon size={17} />
            </button>
            <span className="text-sm font-semibold min-w-[8rem] text-center text-[var(--color-text-primary)]">
              {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(cursor)}
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="p-1.5 rounded hover:bg-[var(--color-missed)]/30 text-[var(--color-text-secondary)]"
              aria-label={bn ? 'পরের মাস' : 'Next month'}
            >
              <ChevronRightIcon size={17} />
            </button>
          </div>
        )}
      </div>

      {/* Main view area */}
      {view === 'year' ? (
        <YearHeatmap
          year={year}
          data={yearLoading && !yearCells ? null : yearCells}
          onPick={pick}
          onYearChange={setYear}
        />
      ) : view === 'week' ? (
        <Card padding="md">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
            {bn ? '🗓 এই সপ্তাহ' : '🗓 This week'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            {weekDays[0]} → {weekDays[6]}
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((ds) => {
              const { done, pct, val, log } = cellInfo(ds);
              const isToday = ds === todayStr;
              const isFuture = ds > todayStr;
              const due = isDueOn(ds) && !isFuture;
              return (
                <button
                  key={ds}
                  onClick={() => pick(ds)}
                  onDoubleClick={() => quickToggle(ds)}
                  disabled={isFuture}
                  className={`aspect-[3/4] rounded-lg p-1 flex flex-col items-center justify-center gap-0.5 text-[10px] transition-all ${
                    done
                      ? 'bg-[var(--color-primary)] text-white'
                      : due
                        ? 'bg-[var(--color-missed)]/20 border border-[var(--color-border)] text-[var(--color-text-primary)]'
                        : 'opacity-30 text-[var(--color-text-secondary)]'
                  } ${isToday ? 'ring-2 ring-[var(--color-accent)]' : ''} ${
                    done ? 'hc-state-done' : due ? 'hc-state-missed' : ''
                  } ${pulseCell === ds ? 'animate-habit-pop' : ''}`}
                >
                  <span className="font-bold">{parseDate(ds).getDate()}</span>
                  {done ? (
                    <CheckIcon size={13} className="stroke-[2.5]" />
                  ) : isQuantity && val > 0 ? (
                    <span className="tabular-nums">{val}/{target}</span>
                  ) : log?.note ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                  ) : null}
                  {isQuantity && done && (
                    <span className="w-full h-0.5 rounded bg-white/40">
                      <span className="block h-full bg-white" style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-3 text-center">
            {bn ? 'একবার click = দেখুন · দুইবার click = সাথে সাথে toggle' : 'Click to view · double-click to toggle'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card padding="md" className="lg:col-span-2">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[11px] font-semibold text-[var(--color-text-secondary)] mb-2">
              {(bn
                ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: startDow }).map((_, i) => (
                <div key={`e${i}`} className="aspect-square opacity-0" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const ds = `${year0}-${String(month0 + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const { done, pct, val, log } = cellInfo(ds);
                const isToday = ds === todayStr;
                const isFuture = ds > todayStr;
                const due = isDueOn(ds) && !isFuture;
                const mood = moodMap.get(ds);
                return (
                  <button
                    key={ds}
                    onClick={() => pick(ds)}
                    onDoubleClick={() => quickToggle(ds)}
                    disabled={isFuture}
                    className={`relative aspect-square rounded-lg sm:rounded-xl p-1 sm:p-1.5 flex flex-col items-center justify-center gap-0.5 text-xs sm:text-sm font-medium transition-all ${
                      done
                        ? 'bg-[var(--color-primary)] text-white'
                        : due
                          ? 'bg-[var(--color-missed)]/20 border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-primary)]/60'
                          : 'opacity-25 text-[var(--color-text-secondary)]'
                    } ${isToday ? 'ring-2 ring-[var(--color-accent)]' : ''} ${
                      done ? 'hc-state-done' : due ? 'hc-state-missed' : ''
                    } ${pulseCell === ds ? 'animate-habit-pop' : ''}`}
                    title={`${ds}${done ? (bn ? ' · সম্পূর্ণ' : ' · done') : due ? (bn ? ' · মিস' : ' · missed') : ''}`}
                    aria-label={`${ds} ${done ? 'done' : due ? 'missed' : 'not due'}`}
                  >
                    <span className="tabular-nums">{dayNum}</span>
                    {done && isQuantity && (
                      <span className="text-[9px] leading-none tabular-nums opacity-90">
                        {val}/{target}
                      </span>
                    )}
                    {done && !isQuantity && <CheckIcon size={12} className="stroke-[2.5]" />}
                    {!done && isQuantity && val > 0 && (
                      <span className="text-[9px] leading-none tabular-nums">{val}/{target}</span>
                    )}
                    {/* note dot */}
                    {log?.note && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] ring-1 ring-[var(--color-card-bg)]" />
                    )}
                    {/* mood dot */}
                    {mood && (
                      <span className="absolute bottom-1 right-1 text-[8px] leading-none">
                        {['😞', '😐', '🙂', '😄', '🤩'][(mood.mood || 3) - 1]}
                      </span>
                    )}
                    {/* partial progress bar */}
                    {isQuantity && due && pct > 0 && pct < 100 && (
                      <span className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded bg-[var(--color-missed)]">
                        <span
                          className="block h-full rounded bg-[var(--color-primary)]"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* legend */}
            <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-center gap-4 text-[10px] text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[var(--color-primary)]" /> {bn ? 'সম্পূর্ণ' : 'Done'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-[var(--color-missed)]/40 border border-[var(--color-border)]" />{' '}
                {bn ? 'মিস' : 'Missed'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded border border-[var(--color-border)] ring-1 ring-[var(--color-accent)]" />{' '}
                {bn ? 'আজ' : 'Today'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" /> {bn ? 'নোট' : 'Note'}
              </span>
            </div>
          </Card>

          {/* Side stats */}
          <TrackStatsPanel
            habit={habit}
            logs={logs}
            monthStart={monthStart}
            monthEnd={monthEnd}
            todayStr={todayStr}
          />
        </div>
      )}

      {/* Timeline (all views) */}
      <TrackTimeline habit={habit} logs={logs} todayStr={todayStr} onPick={pick} />

      {/* Day detail modal — stays open while navigating days */}
      {selectedDate && (
        <DayDetailModal
          habit={habit}
          date={selectedDate}
          log={selectedLog}
          mood={selectedMood ? { mood: selectedMood.mood, energy: selectedMood.energy } : null}
          onClose={() => setSelectedDate(null)}
          onNavigate={(d) => {
            if (d > todayStr) return;
            setSelectedDate(d);
          }}
          onSaved={onSaved}
        />
      )}

      {/* Archive modal */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsArchiveOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md p-5 rounded-xl bg-[var(--color-card-bg)] border border-[var(--color-border)] shadow-xl">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
              {bn ? 'আর্কাইভ করবেন?' : 'Archive habit?'}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              <strong>{habit.name}</strong>{' '}
              {bn
                ? 'চেকলিস্ট থেকে যাবে, ইতিহাস অক্ষত থাকবে।'
                : 'will leave your checklist; history is preserved.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsArchiveOpen(false)} disabled={isArchiving}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleArchive} isLoading={isArchiving}>
                {bn ? 'আর্কাইভ' : 'Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
