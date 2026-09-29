'use server';

import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { Habit, HabitLog, MoodLog } from '@/types';
import { formatDate, parseDate, computeCurrentStreak, computeLongestStreak, computeCurrentStreakWithGrace } from '@/lib/streaks';
import {
  buildAnalytics,
  rangeFromPreset,
  isHabitDueOn,
  AnalyticsBundle,
  DateRange,
  RangeKey,
  toCsv,
} from '@/lib/analytics';
import { ActionResponse } from '@/types';

function parseRange(key: RangeKey, start?: string, end?: string, todayStr?: string): DateRange {
  const today = todayStr || formatDate(new Date());
  if (key === 'custom' && start && end && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)) {
    const a = parseDate(start);
    const b = parseDate(end);
    const from = a <= b ? a : b;
    const to = a <= b ? b : a;
    const span = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    return { start: formatDate(from), end: formatDate(to), days: Math.max(1, Math.min(400, span)) };
  }
  const k = key === 'custom' ? 'month' : key;
  return rangeFromPreset(k, today);
}

async function loadData(userId: string, range: DateRange, graceDays: number) {
  const db = getDbClient();
  const habitsRes = await db.rpc('app_get_habits', { p_user_id: userId });
  const habits = (((habitsRes as { habits?: Habit[] } | null)?.habits || []) as Habit[]);

  // Fetch one extra day of logs before the range so streaks are computed correctly
  const pre = new Date(parseDate(range.start));
  pre.setDate(pre.getDate() - 400);
  const logsRes = await db.rpc('app_get_habit_logs_for_range', {
    p_user_id: userId,
    p_start_date: formatDate(pre),
    p_end_date: range.end,
  });
  const allLogs = (((logsRes as { logs?: HabitLog[] } | null)?.logs || []) as HabitLog[]);

  // mood_logs has no RPC; read the table directly (service key bypasses RLS,
  // and the query is still hard-scoped to the authenticated userId)
  const moodsRes = await db
    .from('mood_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', range.start)
    .lte('log_date', range.end)
    .order('log_date', { ascending: true });
  const moods = ((moodsRes.data || []) as unknown) as MoodLog[];

  const currentStreaks: Record<string, number> = {};
  const longestStreaks: Record<string, number> = {};
  for (const h of habits) {
    const hl = allLogs.filter((l) => l.habit_id === h.id);
    currentStreaks[h.id] = computeCurrentStreakWithGrace(h, hl, range.end, graceDays);
    longestStreaks[h.id] = computeLongestStreak(h, hl);
  }
  return { habits, allLogs, moods, currentStreaks, longestStreaks };
}

export async function getAnalytics(
  key: RangeKey = 'month',
  start?: string,
  end?: string,
  todayStr?: string,
  graceDays: number = 0
): Promise<ActionResponse<AnalyticsBundle & { habitNameById: Record<string, string> }>> {
  return withAuth(async (userId) => {
    const range = parseRange(key, start, end, todayStr);
    const { habits, allLogs, moods, currentStreaks, longestStreaks } = await loadData(
      userId,
      range,
      graceDays
    );
    const bundle = buildAnalytics({
      habits,
      logs: allLogs,
      moods,
      range,
      todayStr: todayStr || formatDate(new Date()),
      currentStreaks,
      longestStreaks,
    });
    const habitNameById: Record<string, string> = {};
    for (const h of habits) habitNameById[h.id] = h.name;
    return { ...bundle, habitNameById };
  });
}

export async function exportAnalyticsCsv(
  key: RangeKey = 'month',
  start?: string,
  end?: string,
  todayStr?: string,
  graceDays: number = 0
): Promise<ActionResponse<string>> {
  return withAuth(async (userId) => {
    const range = parseRange(key, start, end, todayStr);
    const { habits, allLogs, moods, currentStreaks, longestStreaks } = await loadData(
      userId,
      range,
      graceDays
    );
    const bundle = buildAnalytics({
      habits,
      logs: allLogs,
      moods,
      range,
      todayStr: todayStr || formatDate(new Date()),
      currentStreaks,
      longestStreaks,
    });
    const habitNameById: Record<string, string> = {};
    for (const h of habits) habitNameById[h.id] = h.name;
    return toCsv(bundle, habitNameById);
  });
}

/** Year view heatmap data (GitHub style) for the Track page. */
export async function getYearHeatmap(
  year: number,
  habitId: string,
  todayStr?: string
): Promise<
  ActionResponse<{
    year: number;
    cells: { date: string; pct: number; done: boolean; due: boolean; note: boolean }[];
  }>
> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data: habitRow } = await db
      .from('habits')
      .select('*')
      .eq('id', habitId)
      .eq('user_id', userId)
      .maybeSingle();
    const habit = habitRow as Habit | null;
    if (!habit) throw new Error('Habit not found');

    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const { data: logRows } = await db
      .from('habit_logs')
      .select('*')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('log_date', start)
      .lte('log_date', end);
    const logs = (logRows || []) as unknown as HabitLog[];
    const byDate = new Map<string, HabitLog>();
    for (const l of logs) byDate.set(l.log_date, l);

    const { isLogCompleted } = await import('@/lib/streaks');
    const cells: {
      date: string;
      pct: number;
      done: boolean;
      due: boolean;
      note: boolean;
    }[] = [];
    const d = new Date(year, 0, 1);
    for (let i = 0; i < 366; i++) {
      const x = new Date(d);
      x.setDate(d.getDate() + i);
      if (x.getFullYear() !== year) break;
      const ds = formatDate(x);
      const due = isHabitDueOn(habit, ds);
      const log = byDate.get(ds);
      const done = due && log ? isLogCompleted(habit, log) : false;
      let pct = 0;
      if (due) {
        if (habit.goal_type === 'quantity') {
          const target = Number(habit.target_value || 1);
          pct = Math.min(100, Math.round((Number(log?.completed_value || 0) / Math.max(1, target)) * 100));
        } else {
          pct = done ? 100 : 0;
        }
      }
      cells.push({ date: ds, pct, done, due, note: !!(log && log.note) });
    }
    return { year, cells };
  });
}
