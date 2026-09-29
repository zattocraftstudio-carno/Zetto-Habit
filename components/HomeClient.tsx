'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Habit, HabitLog, MoodLog } from '@/types';
import { computeCurrentStreakWithGrace, isLogCompleted } from '@/lib/streaks';
import { setHabitPaused, reorderHabits } from '@/actions/habits';
import { CompletionRing } from '@/components/CompletionRing';
import { HabitChecklistItem } from '@/components/HabitChecklistItem';
import { MoodCard } from '@/components/MoodCard';
import { AiTipCard } from '@/components/AiTipCard';
import { Onboarding } from '@/components/Onboarding';
import { FocusTimer } from '@/components/FocusTimer';
import { PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { RpgHud } from '@/components/RpgHud';
import { RpgState } from '@/actions/rpg';
import { greetingForUser } from '@/lib/greeting';
import { usePrefs } from '@/components/PrefsProvider';

function timeSlot(habit: Habit): { key: string; label: string; order: number } {
  if (!habit.reminder_time) return { key: 'anytime', label: 'যেকোনো সময়', order: 4 };
  const hh = Number(habit.reminder_time.slice(0, 2));
  if (hh >= 5 && hh < 12) return { key: 'morning', label: '☀️ সকাল', order: 0 };
  if (hh >= 12 && hh < 17) return { key: 'noon', label: '🌤️ দুপুর', order: 1 };
  if (hh >= 17 && hh < 21) return { key: 'evening', label: '🌆 সন্ধ্যা', order: 2 };
  return { key: 'night', label: '🌙 রাত', order: 3 };
}

export function HomeClient({
  habits,
  allLogs,
  todayStr,
  graceDays = 0,
  moods = [],
  rpg = null,
  username = '',
}: {
  habits: Habit[];
  allLogs: HabitLog[];
  todayStr: string;
  graceDays?: number;
  moods?: MoodLog[];
  rpg?: RpgState | null;
  username?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t, lang } = usePrefs();
  const bn = lang === 'bn';
  // Greeting is cosmetic, so it is computed on the client from local time
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const t2 = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(t2);
  }, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [timerOpen, setTimerOpen] = useState(false);
  const [showPaused, setShowPaused] = useState(false);

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [habits]
  );
  const pausedHabits = useMemo(() => sortedHabits.filter((h) => h.paused), [sortedHabits]);

  const todayDayOfWeek = new Date().getDay();
  const categories = useMemo(
    () => Array.from(new Set(habits.map((h) => h.category || 'General'))),
    [habits]
  );

  const dueToday = useMemo(
    () =>
      sortedHabits.filter((h) => {
        if (h.paused) return false;
        if (h.frequency_type === 'daily') return true;
        if (h.frequency_type === 'specific_days' && h.frequency_days) {
          return h.frequency_days.includes(todayDayOfWeek);
        }
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortedHabits]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dueToday.filter((h) => {
      if (category !== 'all' && (h.category || 'General') !== category) return false;
      if (q && !h.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dueToday, query, category]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; order: number; items: Habit[] }>();
    for (const h of filtered) {
      const slot = timeSlot(h);
      if (!map.has(slot.key)) map.set(slot.key, { label: slot.label, order: slot.order, items: [] });
      map.get(slot.key)!.items.push(h);
    }
    return Array.from(map.values()).sort((a, b) => a.order - b.order);
  }, [filtered]);

  let completedTodayCount = 0;
  dueToday.forEach((h) => {
    const todayLog = allLogs.find((l) => l.habit_id === h.id && l.log_date === todayStr);
    if (todayLog && isLogCompleted(h, todayLog)) completedTodayCount++;
  });

  const isPlainView = query.trim() === '' && category === 'all';

  const moveHabit = async (habitId: string, dir: -1 | 1) => {
    const order = dueToday.map((h) => h.id);
    const idx = order.indexOf(habitId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= order.length) return;
    [order[idx], order[swap]] = [order[swap], order[idx]];
    // Preserve paused/archived habits' relative positions: rebuild full order
    const pausedIds = sortedHabits.filter((h) => h.paused).map((h) => h.id);
    const fullOrder = [...order, ...pausedIds.filter((id) => !order.includes(id))];
    const res = await reorderHabits(fullOrder);
    if (res.success) router.refresh();
    else toast(res.error, 'error');
  };

  const resumeHabit = async (habitId: string) => {
    const res = await setHabitPaused(habitId, false);
    if (res.success) {
      toast('Habit resumed', 'success');
      router.refresh();
    } else toast(res.error, 'error');
  };
  const completionPercentage =
    dueToday.length > 0 ? Math.round((completedTodayCount / dueToday.length) * 100) : 0;

  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      <Onboarding />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-text-primary)] truncate">
            {username ? greetingForUser(hour, username, bn) : t('home.title')}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setTimerOpen(true)}>
            ⏱ {t('home.timer')}
          </Button>
          <Link href="/add-habit">
            <Button variant="primary" size="sm" className="gap-2">
              <PlusIcon size={18} />
              <span>{t('home.addHabit')}</span>
            </Button>
          </Link>
        </div>
      </div>

      <AiTipCard />

      <RpgHud rpg={rpg} />

      {habits.length === 0 ? (
        <Card padding="lg" className="text-center py-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-4">
            <PlusIcon size={32} />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            {t('home.firstTitle')}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
            {t('home.firstBody')}
          </p>
          <Link href="/add-habit">
            <Button variant="primary" size="md" className="gap-2">
              <PlusIcon size={20} />
              <span>{t('home.firstBtn')}</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Search + category filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('home.search')}
                aria-label="Search habits"
                className="flex-1 min-h-[44px] px-3.5 py-2 text-sm rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] text-[var(--color-text-primary)] focus-visible:outline-[var(--color-primary)]"
              />
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['all', ...categories].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      category === c
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'border border-[var(--color-border)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {c === 'all' ? t('home.all') : c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                {t('home.checklist')} ({completedTodayCount}/{dueToday.length})
              </h2>
            </div>

            {filtered.length === 0 ? (
              <Card padding="md" className="text-center py-8 text-[var(--color-text-secondary)]">
                <p className="text-sm">
                  {dueToday.length === 0 ? t('home.noScheduled') : t('home.noMatch')}
                </p>
              </Card>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">{g.label}</h3>
                  {g.items.map((habit) => {
                    const habitLogs = allLogs.filter((l) => l.habit_id === habit.id);
                    const todayLog = habitLogs.find((l) => l.log_date === todayStr);
                    const currentStreak = computeCurrentStreakWithGrace(habit, habitLogs, todayStr, graceDays);
                    return (
                      <div key={habit.id} className="flex items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <HabitChecklistItem
                            habit={habit}
                            todayLog={todayLog}
                            currentStreak={currentStreak}
                            todayStr={todayStr}
                          />
                        </div>
                        {isPlainView && (
                          <div className="flex flex-col gap-1 pt-3">
                            <button
                              onClick={() => moveHabit(habit.id, -1)}
                              className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-missed)]/20"
                              aria-label={`Move ${habit.name} up`}
                              title="Move up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveHabit(habit.id, 1)}
                              className="p-1 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-missed)]/20"
                              aria-label={`Move ${habit.name} down`}
                              title="Move down"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {pausedHabits.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={() => setShowPaused(!showPaused)}
                  className="text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {bn ? '⏸ Pause' : '⏸ Paused'} ({pausedHabits.length}) {showPaused ? '▲' : '▼'}
                </button>
                {showPaused && (
                  <div className="mt-2 space-y-2">
                    {pausedHabits.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between gap-2 p-3 rounded border border-[var(--color-border)] bg-[var(--color-card-bg)] opacity-70"
                      >
                        <span className="text-sm font-medium truncate">{h.name}</span>
                        <Button variant="secondary" size="sm" onClick={() => resumeHabit(h.id)}>
                          {bn ? 'চালু করুন' : 'Resume'}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card padding="md" className="flex flex-col items-center justify-center text-center p-6">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">
                {t('home.completion')}
              </h2>
              <CompletionRing percentage={completionPercentage} size={140} strokeWidth={12} />
              <div className="mt-4 text-xs text-[var(--color-text-secondary)]">
                {completedTodayCount === dueToday.length && dueToday.length > 0 ? (
                  <span className="text-[var(--color-primary)] font-semibold">
                    {t('home.allDone')}
                  </span>
                ) : (
                  <span>{dueToday.length - completedTodayCount} {t('home.remaining')}</span>
                )}
              </div>
            </Card>

            <Card padding="md" className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('home.summary')}</h2>              <div className="flex justify-between text-xs py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-secondary)]">{t('home.totalTracked')}</span>
                <span className="font-semibold tabular-nums">{habits.length}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-[var(--color-border)]">
                <span className="text-[var(--color-text-secondary)]">{t('home.dueToday')}</span>
                <span className="font-semibold tabular-nums">{dueToday.length}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-[var(--color-text-secondary)]">{t('home.completedToday')}</span>
                <span className="font-semibold tabular-nums text-[var(--color-primary)]">{completedTodayCount}</span>
              </div>
            </Card>

            <MoodCard todayStr={todayStr} initialMoods={moods} />
          </div>
        </div>
      )}

      <FocusTimer isOpen={timerOpen} onClose={() => setTimerOpen(false)} />
    </div>
  );
}
