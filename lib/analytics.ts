import { Habit, HabitLog, MoodLog } from '@/types';
import { formatDate, parseDate, isLogCompleted } from '@/lib/streaks';

// ---------------------------------------------------------------------------
// Pure analytics over existing habits / habit_logs / mood_logs.
// No DB schema changes. Range is always passed in explicitly.
// ---------------------------------------------------------------------------

export type RangeKey = 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  days: number;
}

export function rangeFromPreset(key: Exclude<RangeKey, 'custom'>, todayStr: string): DateRange {
  const today = parseDate(todayStr);
  const d = (back: number) => {
    const x = new Date(today);
    x.setDate(today.getDate() - back);
    return formatDate(x);
  };
  switch (key) {
    case 'week':
      return { start: d(6), end: todayStr, days: 7 };
    case 'month':
      return { start: d(29), end: todayStr, days: 30 };
    case 'quarter':
      return { start: d(89), end: todayStr, days: 90 };
    case 'year':
      return { start: d(364), end: todayStr, days: 365 };
  }
}

export function isHabitDueOn(habit: Habit, dateStr: string): boolean {
  if (habit.archived || habit.paused) return false;
  if (habit.frequency_type === 'daily') return true;
  if (habit.frequency_type === 'specific_days' && habit.frequency_days) {
    return habit.frequency_days.includes(parseDate(dateStr).getDay());
  }
  // times_per_week: due every day, target is weekly
  return true;
}

export interface DayCell {
  date: string;
  completed: number;
  due: number;
  pct: number;
}

export interface OverviewStats {
  activeHabits: number;
  todayPct: number;
  longestActiveStreak: number;
  longestStreakHabit: string | null;
  weekAvg: number;
  weekDelta: number; // +n or -n percentage points vs previous week
}

export interface PatternInsight {
  bestDayIndex: number; // 0=Sun..6=Sat, -1 when unknown
  worstDayIndex: number;
  bestDayPct: number;
  worstDayPct: number;
  mostConsistent: { name: string; rate: number } | null;
  mostMissed: { name: string; missed: number; rate: number } | null;
}

export interface CategorySlice {
  category: string;
  habits: number;
  completed: number;
  share: number; // % of completions
}

export interface HabitSeriesPoint {
  date: string;
  [habitId: string]: string | number;
}

export interface CorrelationInsight {
  habitName: string;
  habitId: string;
  deltaPct: number; // % better mood on days the habit was done
  daysDone: number;
  moodDays: number;
}

export interface AnalyticsBundle {
  range: DateRange;
  overview: OverviewStats;
  series: DayCell[]; // one per day in range (daily completion %)
  perHabit: Record<string, { name: string; color: string; points: DayCell[] }>;
  patterns: PatternInsight;
  categories: CategorySlice[];
  correlation: CorrelationInsight | null;
  totalCompletions: number;
}

const DAY_NAMES_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function dayName(index: number, bn: boolean): string {
  return bn ? DAY_NAMES_BN[index] : DAY_NAMES_EN[index];
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const a = parseDate(start);
  const b = parseDate(end);
  for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(formatDate(d));
    if (out.length > 400) break;
  }
  return out;
}

function bucketFor(days: number): 'day' | 'week' {
  return days > 45 ? 'week' : 'day';
}

export function buildAnalytics(opts: {
  habits: Habit[];
  logs: HabitLog[];
  moods: MoodLog[];
  range: DateRange;
  todayStr: string;
  currentStreaks: Record<string, number>;
  longestStreaks: Record<string, number>;
}): AnalyticsBundle {
  const { habits, logs, moods, range, todayStr, currentStreaks, longestStreaks } = opts;
  const active = habits.filter((h) => !h.archived);

  // index logs by date for fast lookup
  const logsByDate = new Map<string, HabitLog[]>();
  for (const l of logs) {
    if (!logsByDate.has(l.log_date)) logsByDate.set(l.log_date, []);
    logsByDate.get(l.log_date)!.push(l);
  }

  const days = eachDay(range.start, range.end);
  const bucket = bucketFor(range.days);

  // --- per-day completion (all habits combined) ---------------------------
  const series: DayCell[] = days.map((date) => {
    const completed = active.filter((h) => {
      const l = logsByDate.get(date)?.find((x) => x.habit_id === h.id);
      return l && isLogCompleted(h, l);
    }).length;
    const due = active.filter((h) => isHabitDueOn(h, date)).length;
    return { date, completed, due, pct: due > 0 ? Math.round((completed / due) * 100) : 0 };
  });

  // --- per-habit series (for comparison chart) ---------------------------
  // pct keeps partial quantity progress (e.g. 5/20 = 25%) instead of collapsing
  // to 0/100, so the comparison chart reflects real effort.
  const perHabit: Record<string, { name: string; color: string; points: DayCell[] }> = {};
  for (const h of active) {
    perHabit[h.id] = {
      name: h.name,
      color: h.color,
      points: days.map((date) => {
        const l = logsByDate.get(date)?.find((x) => x.habit_id === h.id);
        const completed = l && isLogCompleted(h, l);
        const due = isHabitDueOn(h, date) ? 1 : 0;
        let pct = 0;
        if (completed) pct = 100;
        else if (due && l && h.goal_type === 'quantity') {
          const targetVal = Math.max(1, Number(h.target_value || 1));
          pct = Math.min(
            99,
            Math.round((Number(l.completed_value || 0) / targetVal) * 100)
          );
        }
        return { date, completed: completed ? 1 : 0, due, pct };
      }),
    };
  }

  // --- overview ------------------------------------------------------------
  const todayCell = series.find((c) => c.date === todayStr);
  const weekCells = series.slice(-7);
  const prevWeekCells = series.slice(-14, -7);
  const avg = (cells: DayCell[]) =>
    cells.length ? Math.round(cells.reduce((s, c) => s + c.pct, 0) / cells.length) : 0;
  const weekAvg = avg(weekCells);
  const weekDelta = weekAvg - avg(prevWeekCells);

  let longestStreakHabit: string | null = null;
  let longestActive = 0;
  for (const h of active) {
    if ((currentStreaks[h.id] ?? 0) > longestActive) {
      longestActive = currentStreaks[h.id] ?? 0;
      longestStreakHabit = h.name;
    }
  }

  const overview: OverviewStats = {
    activeHabits: active.length,
    todayPct: todayCell ? todayCell.pct : 0,
    longestActiveStreak: longestActive,
    longestStreakHabit,
    weekAvg,
    weekDelta,
  };

  // --- patterns ------------------------------------------------------------
  // Average completion % per weekday across the range (only weekdays that occur)
  const weekdayPct: number[] = new Array(7).fill(0);
  let bestIdx = -1;
  let worstIdx = -1;
  for (let i = 0; i < 7; i++) {
    const cells = series.filter((c) => parseDate(c.date).getDay() === i);
    if (cells.length === 0) continue;
    const avgPct = Math.round(cells.reduce((s, c) => s + c.pct, 0) / cells.length);
    weekdayPct[i] = avgPct;
    if (bestIdx < 0 || avgPct > weekdayPct[bestIdx]) bestIdx = i;
    if (worstIdx < 0 || avgPct < weekdayPct[worstIdx]) worstIdx = i;
  }
  const patterns: PatternInsight = {
    bestDayIndex: bestIdx,
    worstDayIndex: worstIdx,
    bestDayPct: bestIdx >= 0 ? weekdayPct[bestIdx] : 0,
    worstDayPct: worstIdx >= 0 ? weekdayPct[worstIdx] : 0,
    mostConsistent: null,
    mostMissed: null,
  };

  for (const h of active) {
    const pts = perHabit[h.id].points;
    const dueCount = pts.filter((p) => p.due === 1).length;
    const doneCount = pts.filter((p) => p.completed === 1).length;
    if (dueCount === 0) continue;
    const rate = Math.round((doneCount / dueCount) * 100);
    if (!patterns.mostConsistent || rate > patterns.mostConsistent.rate) {
      patterns.mostConsistent = { name: h.name, rate };
    }
    if (!patterns.mostMissed || dueCount - doneCount > patterns.mostMissed.missed) {
      patterns.mostMissed = { name: h.name, missed: dueCount - doneCount, rate };
    }
  }

  // --- categories ----------------------------------------------------------
  const catMap = new Map<string, { habits: number; completed: number }>();
  for (const h of active) {
    const key = h.category || 'general';
    const c = catMap.get(key) || { habits: 0, completed: 0 };
    c.habits++;
    catMap.set(key, c);
  }
  for (const c of series) {
    for (const h of active) {
      if (!isHabitDueOn(h, c.date)) continue;
      const l = logsByDate.get(c.date)?.find((x) => x.habit_id === h.id);
      if (l && isLogCompleted(h, l)) {
        const g = catMap.get(h.category || 'general');
        if (g) g.completed++;
      }
    }
  }
  const totalCompleted = Array.from(catMap.values()).reduce((s, c) => s + c.completed, 0);
  const categories: CategorySlice[] = Array.from(catMap.entries())
    .map(([category, v]) => ({
      category,
      habits: v.habits,
      completed: v.completed,
      share: totalCompleted > 0 ? Math.round((v.completed / totalCompleted) * 100) : 0,
    }))
    .sort((a, b) => b.share - a.share);

  // --- correlation: habit done vs mood ------------------------------------
  let correlation: CorrelationInsight | null = null;
  if (moods.length >= 5) {
    const moodByDate = new Map(moods.map((m) => [m.log_date, m]));
    let best: CorrelationInsight | null = null;
    for (const h of active) {
      let doneCount = 0;
      const moodOnDone: number[] = [];
      const moodOnSkip: number[] = [];
      for (const c of series) {
        if (!isHabitDueOn(h, c.date)) continue;
        const m = moodByDate.get(c.date);
        if (!m) continue;
        const l = logsByDate.get(c.date)?.find((x) => x.habit_id === h.id);
        if (l && isLogCompleted(h, l)) {
          doneCount++;
          moodOnDone.push(m.mood);
        } else {
          moodOnSkip.push(m.mood);
        }
      }
      if (moodOnDone.length < 3 || moodOnSkip.length < 3) continue;
      const avgDone = moodOnDone.reduce((s, x) => s + x, 0) / moodOnDone.length;
      const avgSkip = moodOnSkip.reduce((s, x) => s + x, 0) / moodOnSkip.length;
      if (avgSkip === 0) continue;
      const pct = Math.round(((avgDone - avgSkip) / avgSkip) * 100);
      if (!Number.isFinite(pct)) continue;
      if (!best || Math.abs(pct) > Math.abs(best.deltaPct)) {
        best = {
          habitId: h.id,
          habitName: h.name,
          deltaPct: pct,
          daysDone: doneCount,
          moodDays: moodOnDone.length + moodOnSkip.length,
        };
      }
    }
    correlation = best;
  }

  return {
    range,
    overview,
    series,
    perHabit,
    patterns,
    categories,
    correlation,
    totalCompletions: totalCompleted,
  };
}

export function toCsv(bundle: AnalyticsBundle, habitNameById: Record<string, string>): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(`# range,${esc(bundle.range.start)},${esc(bundle.range.end)}`);
  lines.push('# daily');
  lines.push('date,completed,due,completion_pct');
  for (const c of bundle.series) lines.push([c.date, c.completed, c.due, c.pct].join(','));
  lines.push('');
  lines.push('# per_habit');
  lines.push('date,habit,completed,due,completion_pct');
  for (const [id, series] of Object.entries(bundle.perHabit)) {
    const name = habitNameById[id] || series.name;
    for (const p of series.points) {
      if (p.due === 0) continue;
      lines.push([p.date, esc(name), p.completed, p.due, p.pct].join(','));
    }
  }
  return lines.join('\n');
}
