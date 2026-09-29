'use server';

import { revalidatePath } from 'next/cache';
import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { HabitLog, ActionResponse, Habit } from '@/types';
import { formatDate, parseDate, computeCurrentStreak, computeCurrentStreakWithGrace, computeLongestStreak, computeCompletionRate } from '@/lib/streaks';
import { hashPassword, verifyPassword } from '@/lib/hash';
import { clearSessionCookie } from '@/lib/session';

export async function upsertHabitLog(
  habitId: string,
  logDate: string, // YYYY-MM-DD
  completedValue: number | null,
  note?: string | null
): Promise<ActionResponse<HabitLog>> {
  return withAuth(async (userId) => {
    // Enforce server-side: never log future dates.
    // Per plan Open Questions, the client sends its local calendar date
    // (YYYY-MM-DD string) directly — the server never derives it from UTC.
    // YYYY-MM-DD strings compare lexicographically.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD.');
    }
    const serverTodayStr = formatDate(new Date());
    if (logDate > serverTodayStr) {
      throw new Error('Cannot log habits for future dates');
    }

    const db = getDbClient();

    // Previous state (for first-completion detection — no double XP on re-log)
    let wasComplete = false;
    try {
      const { data: prevRes } = await db.rpc('app_get_habit_logs_by_habit', {
        p_user_id: userId,
        p_habit_id: habitId,
        p_start_date: logDate,
        p_end_date: logDate,
      });
      const prevLogs = ((prevRes as { logs?: HabitLog[] } | null)?.logs || []) as HabitLog[];
      const { data: hRes } = await db.rpc('app_get_habit_by_id', {
        p_user_id: userId,
        p_habit_id: habitId,
      });
      const habitObj = (hRes as { habit?: Habit } | null)?.habit;
      if (habitObj && prevLogs.length > 0) {
        const { isLogCompleted: check } = await import('@/lib/streaks');
        wasComplete = check(habitObj, prevLogs[0]);
      }
    } catch {
      wasComplete = false;
    }

    const { data, error } = await db.rpc('app_upsert_habit_log', {
      p_user_id: userId,
      p_habit_id: habitId,
      p_log_date: logDate,
      p_completed_value: completedValue,
      p_note: note || null,
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to update habit log');
    }

    revalidatePath('/home');
    revalidatePath('/dashboard');
    revalidatePath(`/track/${habitId}`);
    const log = data.log as HabitLog & { _rpg?: unknown };

    // RPG rewards — never break logging if the game engine fails
    try {
      const { data: hRes2 } = await db.rpc('app_get_habit_by_id', {
        p_user_id: userId,
        p_habit_id: habitId,
      });
      const habitObj2 = (hRes2 as { habit?: Habit } | null)?.habit;
      if (habitObj2) {
        const { isLogCompleted: check2 } = await import('@/lib/streaks');
        const nowComplete = check2(habitObj2, log);
        if (nowComplete && !wasComplete) {
          const { data: allRes } = await db.rpc('app_get_habits', { p_user_id: userId });
          const allHabits = (((allRes as { habits?: Habit[] } | null)?.habits || []) as Habit[]);
          const { data: dayRes } = await db.rpc('app_get_habit_logs_for_range', {
            p_user_id: userId,
            p_start_date: logDate,
            p_end_date: logDate,
          });
          const dayLogs = (((dayRes as { logs?: HabitLog[] } | null)?.logs || []) as HabitLog[]);
          const { processLogReward } = await import('@/lib/rpg');
          log._rpg = await processLogReward(userId, habitObj2, logDate, allHabits, dayLogs);
        }
      }
    } catch (err) {
      console.warn('RPG reward skipped:', err instanceof Error ? err.message : err);
    }
    return log;
  });
}

export async function getHabitLogsForRange(
  startDate: string,
  endDate: string
): Promise<ActionResponse<HabitLog[]>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_get_habit_logs_for_range', {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error || !data?.success) {
      throw new Error('Failed to fetch habit logs');
    }

    return (data.logs || []) as HabitLog[];
  });
}

export async function getHabitLogsByHabit(
  habitId: string,
  startDate?: string,
  endDate?: string
): Promise<ActionResponse<HabitLog[]>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_get_habit_logs_by_habit', {
      p_user_id: userId,
      p_habit_id: habitId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error || !data?.success) {
      throw new Error('Failed to fetch habit logs for habit');
    }

    return (data.logs || []) as HabitLog[];
  });
}

export async function getDashboardData(clientTodayStr: string = formatDate(new Date()), graceDays: number = 0): Promise<
  ActionResponse<{
    habits: Habit[];
    logs: HabitLog[];
    rankedHabits: Array<
      Habit & {
        currentStreak: number;
        longestStreak: number;
        completionRate: number;
      }
    >;
    weeklyStats: Array<{
      date: string;
      dayLabel: string;
      completionRate: number;
      completedCount: number;
      totalHabits: number;
    }>;
    monthlyStats: Array<{
      date: string;
      dayNumber: number;
      completionRate: number;
    }>;
  }>
> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const today = parseDate(clientTodayStr);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [habitsRes, logsRes] = await Promise.all([
      db.rpc('app_get_habits', { p_user_id: userId }),
      db.rpc('app_get_habit_logs_for_range', {
        p_user_id: userId,
        p_start_date: formatDate(thirtyDaysAgo),
        p_end_date: clientTodayStr,
      }),
    ]);

    const habits = (habitsRes.data?.habits || []) as Habit[];
    const logs = (logsRes.data?.logs || []) as HabitLog[];

    // Calculate streaks and rates for all habits
    const rankedHabits = habits
      .map((habit) => {
        const habitLogs = logs.filter((l) => l.habit_id === habit.id);
        const currentStreak = computeCurrentStreakWithGrace(habit, habitLogs, clientTodayStr, graceDays);
        const longestStreak = computeLongestStreak(habit, habitLogs);
        const completionRate = computeCompletionRate(habit, habitLogs, 30, clientTodayStr);
        return {
          ...habit,
          currentStreak,
          longestStreak,
          completionRate,
        };
      })
      .sort((a, b) => {
        // Sort by current streak descending, then alphabetically by name
        if (b.currentStreak !== a.currentStreak) {
          return b.currentStreak - a.currentStreak;
        }
        return a.name.localeCompare(b.name);
      });

    // Weekly stats (last 7 days)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyStats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = formatDate(d);

      const dayLogs = logs.filter((l) => l.log_date === dStr);
      let completedCount = 0;
      let totalDue = 0;

      for (const h of habits) {
        if (h.paused) continue;
        let isDue = false;
        if (h.frequency_type === 'daily') isDue = true;
        else if (h.frequency_type === 'specific_days' && h.frequency_days?.includes(d.getDay())) isDue = true;
        else isDue = true;

        if (isDue) {
          totalDue++;
          const log = dayLogs.find((l) => l.habit_id === h.id);
          if (log && log.completed_value && Number(log.completed_value) >= (h.goal_type === 'quantity' ? (h.target_value ?? 1) : 1)) {
            completedCount++;
          }
        }
      }

      weeklyStats.push({
        date: dStr,
        dayLabel: days[d.getDay()],
        completionRate: totalDue > 0 ? Math.round((completedCount / totalDue) * 100) : 0,
        completedCount,
        totalHabits: totalDue,
      });
    }

    // Monthly stats (last 30 days)
    const monthlyStats = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = formatDate(d);
      const dayLogs = logs.filter((l) => l.log_date === dStr);

      let completedCount = 0;
      let totalDue = 0;

      for (const h of habits) {
        if (h.paused) continue;
        let isDue = false;
        if (h.frequency_type === 'daily') isDue = true;
        else if (h.frequency_type === 'specific_days' && h.frequency_days?.includes(d.getDay())) isDue = true;
        else isDue = true;

        if (isDue) {
          totalDue++;
          const log = dayLogs.find((l) => l.habit_id === h.id);
          if (log && log.completed_value && Number(log.completed_value) >= (h.goal_type === 'quantity' ? (h.target_value ?? 1) : 1)) {
            completedCount++;
          }
        }
      }

      monthlyStats.push({
        date: dStr,
        dayNumber: d.getDate(),
        completionRate: totalDue > 0 ? Math.round((completedCount / totalDue) * 100) : 0,
      });
    }

    return {
      habits,
      logs,
      rankedHabits,
      weeklyStats,
      monthlyStats,
    };
  });
}

export async function exportUserData(): Promise<ActionResponse<string>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_export_user_data', {
      p_user_id: userId,
    });

    if (error || !data) {
      throw new Error('Failed to export user data');
    }

    return JSON.stringify(data, null, 2);
  });
}

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export async function exportUserDataCsv(): Promise<ActionResponse<string>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_export_user_data', {
      p_user_id: userId,
    });

    if (error || !data) {
      throw new Error('Failed to export user data');
    }

    // Normalize RPC payload shapes: { habits: [...], habit_logs/logs: [...] }
    const habits: Record<string, unknown>[] =
      (data.habits as Record<string, unknown>[]) ||
      (data.data?.habits as Record<string, unknown>[]) ||
      [];
    const logs: Record<string, unknown>[] =
      (data.habit_logs as Record<string, unknown>[]) ||
      (data.logs as Record<string, unknown>[]) ||
      (data.data?.logs as Record<string, unknown>[]) ||
      [];

    const habitHeaders = [
      'id',
      'name',
      'category',
      'frequency_type',
      'goal_type',
      'target_value',
      'unit_label',
      'color',
      'archived',
      'created_at',
    ];
    const logHeaders = [
      'id',
      'habit_id',
      'log_date',
      'completed_value',
      'note',
      'created_at',
    ];

    const lines: string[] = [];
    lines.push('# habits');
    lines.push(habitHeaders.join(','));
    for (const h of habits) {
      lines.push(habitHeaders.map((k) => escapeCsvCell(h[k])).join(','));
    }
    lines.push('');
    lines.push('# habit_logs');
    lines.push(logHeaders.join(','));
    for (const l of logs) {
      lines.push(logHeaders.map((k) => escapeCsvCell(l[k])).join(','));
    }

    return lines.join('\n');
  });
}

export async function updateUsername(newUsername: string): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    const trimmed = newUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      throw new Error('Username must be between 3 and 30 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new Error('Username can only contain letters, numbers, underscores, and dashes');
    }

    const db = getDbClient();
    const { data, error } = await db.rpc('app_update_username', {
      p_user_id: userId,
      p_new_username: trimmed,
    });

    if (error || !data?.success) {
      throw new Error(data?.error || 'Failed to update username');
    }

    return true;
  });
}

export async function updatePassword(
  currentPass: string,
  newPass: string
): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId, username) => {
    if (newPass.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }

    const db = getDbClient();
    const { data: userRes } = await db.rpc('app_get_user_by_username', {
      p_username: username,
    });

    if (!userRes?.found) {
      throw new Error('User not found');
    }

    const isMatch = await verifyPassword(currentPass, userRes.user.password_hash);
    if (!isMatch) {
      throw new Error('Current password does not match');
    }

    const newHash = await hashPassword(newPass);
    const { data, error } = await db.rpc('app_update_password', {
      p_user_id: userId,
      p_new_password_hash: newHash,
    });

    if (error || !data?.success) {
      throw new Error('Failed to update password');
    }

    return true;
  });
}

export async function deleteAccount(): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { data, error } = await db.rpc('app_delete_user', {
      p_user_id: userId,
    });

    if (error || !data?.success) {
      throw new Error('Failed to delete account');
    }

    await clearSessionCookie();
    return true;
  });
}
