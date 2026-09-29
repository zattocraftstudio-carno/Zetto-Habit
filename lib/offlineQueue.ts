'use client';

import { upsertHabitLog } from '@/actions/habitLogs';

export interface QueuedLog {
  habitId: string;
  logDate: string;
  value: number | null;
  note: string | null;
  queuedAt: number;
}

const OUTBOX_KEY = 'habit_outbox_v1';

function readOutbox(): QueuedLog[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: QueuedLog[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {
    // ignore
  }
}

export function queueLog(entry: Omit<QueuedLog, 'queuedAt'>) {
  const box = readOutbox();
  // Replace any pending entry for the same habit+date
  const filtered = box.filter((e) => !(e.habitId === entry.habitId && e.logDate === entry.logDate));
  filtered.push({ ...entry, queuedAt: Date.now() });
  writeOutbox(filtered);
}

export function pendingCount(): number {
  try {
    return readOutbox().length;
  } catch {
    return 0;
  }
}

function isNetworkFailure(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to fetch|fetch failed|network|offline|load failed/i.test(msg);
}

export interface RpgRewardPayload {
  xp: number;
  coins: number;
  leveledUp: boolean;
  newLevel: { level: number; name: string; nameBn: string; emoji: string } | null;
  questsDone: string[];
  achievements: string[];
  boxesEarned: number;
}

/**
 * Save a habit log, queueing it offline when the network is down.
 * Returns { queued: true } when stored for later sync.
 */
export async function saveLogWithQueue(
  habitId: string,
  logDate: string,
  value: number | null,
  note: string | null
): Promise<{ queued: boolean; success: boolean; error?: string; rpg?: RpgRewardPayload }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    queueLog({ habitId, logDate, value, note });
    return { queued: true, success: true };
  }
  try {
    const res = await upsertHabitLog(habitId, logDate, value, note);
    if (!res.success) return { queued: false, success: false, error: res.error };
    const rpg = (res.data as unknown as { _rpg?: RpgRewardPayload })?._rpg;
    return { queued: false, success: true, rpg };
  } catch (err: unknown) {
    if (isNetworkFailure(err)) {
      queueLog({ habitId, logDate, value, note });
      return { queued: true, success: true };
    }
    throw err;
  }
}

/** Push all queued logs to the server. Returns synced/failed counts. */
export async function syncOutbox(): Promise<{ synced: number; failed: number }> {
  const box = readOutbox();
  let synced = 0;
  let failed = 0;
  const remaining: QueuedLog[] = [];
  for (const e of box) {
    try {
      const res = await upsertHabitLog(e.habitId, e.logDate, e.value, e.note);
      if (res.success) synced++;
      else {
        failed++;
        remaining.push(e);
      }
    } catch {
      failed++;
      remaining.push(e);
    }
  }
  writeOutbox(remaining);
  return { synced, failed };
}
