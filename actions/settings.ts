'use server';

import { z } from 'zod';
import { getDbClient } from '@/lib/db';
import { withAuth } from '@/lib/withAuth';
import { hashBirthDate, verifyPassword } from '@/lib/hash';
import { ActionResponse, Habit } from '@/types';

function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export async function updateBirthDate(
  currentPassword: string,
  newBirthDate: string
): Promise<ActionResponse<boolean>> {
  return withAuth(async (userId, username) => {
    if (!isValidDateStr(newBirthDate)) {
      throw new Error('Birth date must be a valid date (YYYY-MM-DD)');
    }
    if (newBirthDate > new Date().toISOString().slice(0, 10)) {
      throw new Error('Birth date cannot be in the future');
    }

    const db = getDbClient();
    const { data: userRes } = await db.rpc('app_get_user_by_username', {
      p_username: username,
    });
    if (!userRes?.found) throw new Error('User not found');

    const okPass = await verifyPassword(currentPassword, userRes.user.password_hash);
    if (!okPass) throw new Error('Current password does not match');

    const newHash = await hashBirthDate(newBirthDate);
    const { error } = await db.from('users').update({ birth_date_hash: newHash }).eq('id', userId);
    if (error) throw new Error('Failed to update birth date');
    return true;
  });
}

export async function wipeHabitLogs(): Promise<ActionResponse<number>> {
  return withAuth(async (userId) => {
    const db = getDbClient();
    const { error, count } = await db
      .from('habit_logs')
      .delete({ count: 'exact' })
      .eq('user_id', userId);
    if (error) throw new Error('Failed to erase logs');
    return count ?? 0;
  });
}

const MAX_IMPORT_HABITS = 200;
const MAX_IMPORT_LOGS = 10000;

function parseCsvSection(lines: string[], startIdx: number): { headers: string[]; rows: string[][]; next: number } {
  const headers = splitCsvLine(lines[startIdx]);
  const rows: string[][] = [];
  let i = startIdx + 1;
  while (i < lines.length && lines[i].trim() !== '' && !lines[i].startsWith('#')) {
    rows.push(splitCsvLine(lines[i]));
    i++;
  }
  return { headers, rows, next: i };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function toObj(headers: string[], row: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  headers.forEach((h, i) => {
    o[h] = row[i] ?? '';
  });
  return o;
}

interface ImportHabit {
  oldId?: string;
  name: string;
  category?: string | null;
  frequency_type?: string;
  frequency_days?: number[] | null;
  frequency_target?: number | null;
  goal_type?: string;
  target_value?: number | null;
  unit_label?: string | null;
  color?: string;
  icon_svg?: string | null;
  reminder_time?: string | null;
}

interface ImportLog {
  habit_id?: string;
  habitId?: string;
  log_date?: string;
  logDate?: string;
  completed_value?: number | null;
  completedValue?: number | null;
  note?: string | null;
}

function normalizeHabit(h: Record<string, unknown>): ImportHabit | null {
  const name = String(h.name || '').trim();
  if (!name) return null;
  const freq = ['daily', 'specific_days', 'times_per_week'].includes(String(h.frequency_type))
    ? String(h.frequency_type)
    : 'daily';
  const goal = h.goal_type === 'quantity' ? 'quantity' : 'checkbox';
  let days: number[] | null = null;
  if (Array.isArray(h.frequency_days)) {
    days = (h.frequency_days as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  } else if (typeof h.frequency_days === 'string' && h.frequency_days.startsWith('{')) {
    days = h.frequency_days
      .replace(/[{}]/g, '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  }
  return {
    oldId: typeof h.id === 'string' ? h.id : undefined,
    name: name.slice(0, 100),
    category: typeof h.category === 'string' ? h.category : null,
    frequency_type: freq,
    frequency_days: days,
    frequency_target: Number.isFinite(Number(h.frequency_target)) ? Number(h.frequency_target) : null,
    goal_type: goal,
    target_value: Number.isFinite(Number(h.target_value)) ? Number(h.target_value) : null,
    unit_label: typeof h.unit_label === 'string' ? h.unit_label : null,
    color: typeof h.color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h.color) ? h.color : '#2E7D6B',
    icon_svg: typeof h.icon_svg === 'string' ? h.icon_svg : typeof h.icon === 'string' ? h.icon : 'water',
    reminder_time: typeof h.reminder_time === 'string' ? h.reminder_time : null,
  };
}

function normalizeLog(l: Record<string, unknown>): ImportLog | null {
  const date = String(l.log_date || l.logDate || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const v = l.completed_value ?? l.completedValue;
  return {
    habit_id: typeof l.habit_id === 'string' ? l.habit_id : typeof l.habitId === 'string' ? l.habitId : undefined,
    log_date: date,
    completed_value: v === null || v === undefined || v === '' ? null : Number(v),
    note: typeof l.note === 'string' ? l.note : null,
  };
}

export async function importUserData(
  fileContent: string,
  fileName: string
): Promise<ActionResponse<{ habits: number; logs: number }>> {
  return withAuth(async (userId) => {
    let habits: ImportHabit[] = [];
    let logs: ImportLog[] = [];

    if (/\.json$/i.test(fileName)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(fileContent);
      } catch {
        throw new Error('Invalid JSON file');
      }
      const root = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
      const rawHabits = (root.habits ?? (root.data as Record<string, unknown> | undefined)?.habits ?? []) as unknown[];
      const rawLogs = ((root.habit_logs ?? root.logs ?? (root.data as Record<string, unknown> | undefined)?.logs ?? []) as unknown[]);
      habits = rawHabits
        .filter((h): h is Record<string, unknown> => !!h && typeof h === 'object')
        .map(normalizeHabit)
        .filter((h): h is ImportHabit => h !== null)
        .slice(0, MAX_IMPORT_HABITS);
      logs = rawLogs
        .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
        .map(normalizeLog)
        .filter((l): l is ImportLog => l !== null)
        .slice(0, MAX_IMPORT_LOGS);
    } else if (/\.csv$/i.test(fileName)) {
      const lines = fileContent.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t === '# habits' && i + 1 < lines.length) {
          const sec = parseCsvSection(lines, i + 1);
          habits = sec.rows
            .map((r) => normalizeHabit(toObj(sec.headers, r) as unknown as Record<string, unknown>))
            .filter((h): h is ImportHabit => h !== null)
            .slice(0, MAX_IMPORT_HABITS);
          i = sec.next;
        } else if (t === '# habit_logs' && i + 1 < lines.length) {
          const sec = parseCsvSection(lines, i + 1);
          logs = sec.rows
            .map((r) => normalizeLog(toObj(sec.headers, r) as unknown as Record<string, unknown>))
            .filter((l): l is ImportLog => l !== null)
            .slice(0, MAX_IMPORT_LOGS);
          i = sec.next;
        }
      }
      if (habits.length === 0 && logs.length === 0) {
        throw new Error('No habits or logs found. Use a file exported from this app.');
      }
    } else {
      throw new Error('Only .json or .csv files are supported');
    }

    const db = getDbClient();
    const idMap = new Map<string, string>();
    let habitCount = 0;

    for (const h of habits) {
      const { data, error } = await db.rpc('app_create_habit', {
        p_user_id: userId,
        p_name: h.name,
        p_category: h.category || null,
        p_frequency_type: h.frequency_type || 'daily',
        p_frequency_days: h.frequency_type === 'specific_days' ? h.frequency_days || [] : null,
        p_frequency_target: h.frequency_type === 'times_per_week' ? h.frequency_target || 1 : null,
        p_goal_type: h.goal_type || 'checkbox',
        p_target_value: h.goal_type === 'quantity' ? h.target_value || 1 : null,
        p_unit_label: h.goal_type === 'quantity' ? h.unit_label || '' : null,
        p_color: h.color || '#2E7D6B',
        p_icon_svg: h.icon_svg || 'water',
        p_reminder_time: h.reminder_time || null,
      });
      if (!error && data?.success) {
        habitCount++;
        if (h.oldId) idMap.set(h.oldId, (data.habit as Habit).id);
      }
    }

    // Map logs to habits: by old id first, then by name
    const { data: existingRes } = await db.rpc('app_get_habits', { p_user_id: userId });
    const existing = ((existingRes?.habits || []) as Habit[]);
    const byName = new Map(existing.map((h) => [h.name.toLowerCase(), h.id]));
    // Rebuild id map for CSV imports where old ids may collide with existing ones:
    // prefer freshly created habits is not trackable here, so name match wins for logs.
    void idMap;

    const todayStr = new Date().toISOString().slice(0, 10);
    let logCount = 0;
    for (const l of logs) {
      if (!l.log_date || l.log_date > todayStr) continue;
      // Find habit: logs from our own export carry old habit ids — match by name via habits list
      let habitId: string | undefined;
      const srcHabit = habits.find((h) => h.oldId === l.habit_id);
      if (srcHabit) habitId = byName.get(srcHabit.name.toLowerCase());
      if (!habitId && l.habit_id) {
        const direct = existing.find((h) => h.id === l.habit_id);
        if (direct) habitId = direct.id;
      }
      if (!habitId) continue;
      const { data, error } = await db.rpc('app_upsert_habit_log', {
        p_user_id: userId,
        p_habit_id: habitId,
        p_log_date: l.log_date,
        p_completed_value: l.completed_value,
        p_note: l.note || null,
      });
      if (!error && data?.success) logCount++;
    }

    return { habits: habitCount, logs: logCount };
  });
}
