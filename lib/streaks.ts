import { Habit, HabitLog } from '@/types';

export function isLogCompleted(habit: Habit, log?: HabitLog | null): boolean {
  if (!log || log.completed_value === null || log.completed_value === undefined) {
    return false;
  }
  if (habit.goal_type === 'quantity') {
    const target = habit.target_value ?? 1;
    return Number(log.completed_value) >= Number(target);
  }
  // Checkbox goal type: 1 means done
  return Number(log.completed_value) >= 1;
}

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * App-day string honoring the day-start cutoff (for night owls).
 * e.g. dayStartHour=2: 01:30 AM still counts as the previous calendar day.
 */
export function getAppTodayStr(dayStartHour: number = 0, now: Date = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setHours(dayStartHour, 0, 0, 0);
  const appDay = now < cutoff ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
  return formatDate(appDay);
}

/**
 * Current streak with grace days: up to `graceDays` missed due-days are
 * forgiven inside the active run (monthly allowance from settings).
 * Only completed days are counted; grace days never inflate the number.
 * Supported for daily + specific_days; other frequencies fall back to plain.
 */
export function computeCurrentStreakWithGrace(
  habit: Habit,
  logs: HabitLog[],
  todayStr: string = formatDate(new Date()),
  graceDays: number = 0
): number {
  if (!graceDays || graceDays <= 0) {
    return computeCurrentStreak(habit, logs, todayStr);
  }
  if (!logs || logs.length === 0) return 0;

  const completedDates = new Set<string>();
  for (const log of logs) {
    if (isLogCompleted(habit, log)) completedDates.add(log.log_date);
  }
  if (completedDates.size === 0) return 0;

  const today = parseDate(todayStr);
  let graceLeft = Math.min(7, Math.max(0, Math.floor(graceDays)));

  if (habit.frequency_type === 'daily') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let cursor: Date;
    if (completedDates.has(todayStr)) cursor = new Date(today);
    else if (completedDates.has(formatDate(yesterday))) cursor = new Date(yesterday);
    else return 0;

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const dStr = formatDate(cursor);
      if (completedDates.has(dStr)) {
        streak++;
      } else if (dStr !== todayStr && graceLeft > 0) {
        // Forgive a missed day (never today itself — today is still pending)
        graceLeft--;
      } else if (dStr === todayStr) {
        // today pending is fine, keep walking
      } else {
        break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  if (habit.frequency_type === 'specific_days' && habit.frequency_days && habit.frequency_days.length > 0) {
    const validDays = new Set(habit.frequency_days);
    let cursor = new Date(today);
    while (!validDays.has(cursor.getDay())) cursor.setDate(cursor.getDate() - 1);

    // Streak must be alive: latest due day done, or forgivable
    if (!completedDates.has(formatDate(cursor))) {
      if (formatDate(cursor) === todayStr) {
        cursor.setDate(cursor.getDate() - 1);
        while (!validDays.has(cursor.getDay())) cursor.setDate(cursor.getDate() - 1);
        if (!completedDates.has(formatDate(cursor))) {
          if (graceLeft <= 0) return 0;
          graceLeft--;
        }
      } else if (graceLeft > 0) {
        graceLeft--;
      } else {
        return 0;
      }
    }

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      if (validDays.has(cursor.getDay())) {
        const dStr = formatDate(cursor);
        if (completedDates.has(dStr)) streak++;
        else if (dStr !== todayStr && graceLeft > 0) graceLeft--;
        else if (dStr !== todayStr) break;
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  return computeCurrentStreak(habit, logs, todayStr);
}

/**
 * Computes current streak for a habit given its logs and today's date string (client local date)
 */
export function computeCurrentStreak(
  habit: Habit,
  logs: HabitLog[],
  todayStr: string = formatDate(new Date())
): number {
  if (!logs || logs.length === 0) return 0;

  // Build a set of completed log dates
  const completedDates = new Set<string>();
  for (const log of logs) {
    if (isLogCompleted(habit, log)) {
      completedDates.add(log.log_date);
    }
  }

  if (completedDates.size === 0) return 0;

  const today = parseDate(todayStr);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  // If frequency is 'daily'
  if (habit.frequency_type === 'daily') {
    let streak = 0;
    // Check if streak is active (completed today OR completed yesterday)
    let checkDate: Date;
    if (completedDates.has(todayStr)) {
      checkDate = new Date(today);
    } else if (completedDates.has(yesterdayStr)) {
      checkDate = new Date(yesterday);
    } else {
      return 0; // streak broken
    }

    while (true) {
      const dStr = formatDate(checkDate);
      if (completedDates.has(dStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // If frequency is 'specific_days' (e.g. [1, 3, 5] for Mon, Wed, Fri; 0=Sun..6=Sat)
  if (habit.frequency_type === 'specific_days' && habit.frequency_days && habit.frequency_days.length > 0) {
    const validDays = new Set(habit.frequency_days);
    let streak = 0;

    // Find the latest due day (either today if due, or latest past due day)
    let currentCheck = new Date(today);
    // Rewind to today or past
    while (!validDays.has(currentCheck.getDay())) {
      currentCheck.setDate(currentCheck.getDate() - 1);
    }

    // If today is due and not completed, check if yesterday's due day was completed
    const currentStr = formatDate(currentCheck);
    if (!completedDates.has(currentStr)) {
      // If the latest due day wasn't completed, is it today? If it is today, maybe previous was completed
      if (currentStr === todayStr) {
        currentCheck.setDate(currentCheck.getDate() - 1);
        while (!validDays.has(currentCheck.getDay())) {
          currentCheck.setDate(currentCheck.getDate() - 1);
        }
        if (!completedDates.has(formatDate(currentCheck))) {
          return 0;
        }
      } else {
        return 0;
      }
    }

    // Count backwards through due days
    while (true) {
      if (validDays.has(currentCheck.getDay())) {
        const dStr = formatDate(currentCheck);
        if (completedDates.has(dStr)) {
          streak++;
        } else {
          break;
        }
      }
      currentCheck.setDate(currentCheck.getDate() - 1);
    }
    return streak;
  }

  // Default / fallback: consecutive completed entries
  const sortedDates = Array.from(completedDates).sort().reverse();
  if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 1;
  let curr = parseDate(sortedDates[0]);
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = parseDate(sortedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak++;
      curr = prev;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Computes longest streak across all logs
 */
export function computeLongestStreak(habit: Habit, logs: HabitLog[]): number {
  if (!logs || logs.length === 0) return 0;

  const completedDates = Array.from(
    new Set(
      logs
        .filter((l) => isLogCompleted(habit, l))
        .map((l) => l.log_date)
    )
  ).sort();

  if (completedDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < completedDates.length; i++) {
    const prev = parseDate(completedDates[i - 1]);
    const curr = parseDate(completedDates[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

/**
 * Computes completion rate for a habit over the last N days
 */
export function computeCompletionRate(
  habit: Habit,
  logs: HabitLog[],
  daysCount: number = 30,
  todayStr: string = formatDate(new Date())
): number {
  const today = parseDate(todayStr);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysCount + 1);

  const completedDates = new Set(
    logs
      .filter((l) => isLogCompleted(habit, l) && l.log_date >= formatDate(startDate) && l.log_date <= todayStr)
      .map((l) => l.log_date)
  );

  let expectedCount = 0;
  const curr = new Date(startDate);

  while (curr <= today) {
    if (habit.frequency_type === 'daily') {
      expectedCount++;
    } else if (habit.frequency_type === 'specific_days' && habit.frequency_days) {
      if (habit.frequency_days.includes(curr.getDay())) {
        expectedCount++;
      }
    } else {
      expectedCount++;
    }
    curr.setDate(curr.getDate() + 1);
  }

  if (expectedCount === 0) return 0;
  const rate = Math.round((completedDates.size / expectedCount) * 100);
  return Math.min(100, Math.max(0, rate));
}

/**
 * Prepares daily completion rates for heatmap (last 12-16 weeks)
 */
export function computeHeatmapData(
  habits: Habit[],
  logs: HabitLog[],
  weeksCount: number = 16,
  todayStr: string = formatDate(new Date())
): { date: string; rate: number; completedCount: number; totalHabits: number }[] {
  if (habits.length === 0) return [];

  const today = parseDate(todayStr);
  const dayOfWeek = today.getDay(); // 0=Sun..6=Sat
  // End on Saturday or today
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - weeksCount * 7 + (6 - dayOfWeek));

  const mapByDate = new Map<string, { completed: number; total: number }>();
  const curr = new Date(startDate);

  while (curr <= endDate) {
    const dStr = formatDate(curr);
    mapByDate.set(dStr, { completed: 0, total: habits.length });
    curr.setDate(curr.getDate() + 1);
  }

  for (const log of logs) {
    const habit = habits.find((h) => h.id === log.habit_id);
    if (habit && isLogCompleted(habit, log)) {
      const entry = mapByDate.get(log.log_date);
      if (entry) {
        entry.completed++;
      }
    }
  }

  return Array.from(mapByDate.entries()).map(([date, { completed, total }]) => ({
    date,
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    completedCount: completed,
    totalHabits: total,
  }));
}
