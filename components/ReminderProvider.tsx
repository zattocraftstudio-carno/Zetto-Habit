'use client';

import { useEffect, useRef } from 'react';
import { usePrefs } from '@/components/PrefsProvider';
import { getHabits } from '@/actions/habits';
import { getHabitLogsForRange } from '@/actions/habitLogs';
import { formatDate, isLogCompleted } from '@/lib/streaks';

function parseHM(s: string): { h: number; m: number } | null {
  const m = s.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function inQuiet(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const s = parseHM(start);
  const e = parseHM(end);
  if (!s || !e) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = s.h * 60 + s.m;
  const b = e.h * 60 + e.m;
  if (a === b) return false;
  return a < b ? cur >= a && cur < b : cur >= a || cur < b;
}

function saidToday(key: string): boolean {
  try {
    return localStorage.getItem(key) === formatDate(new Date());
  } catch {
    return false;
  }
}

function markToday(key: string) {
  try {
    localStorage.setItem(key, formatDate(new Date()));
  } catch {
    // ignore
  }
}

function notify(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, tag: `habit-${Date.now()}` });
    }
  } catch {
    // denied or unavailable — silent
  }
}

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePrefs();
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const p = prefsRef.current;
      if (!p.notifications.enabled) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      if (inQuiet(now, p.notifications.quietStart, p.notifications.quietEnd)) return;

      const bn = p.language === 'bn';
      const todayStr = formatDate(now);
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      try {
        const habitsRes = await getHabits();
        if (!habitsRes.success) return;
        const habits = habitsRes.data;
        const logsRes = await getHabitLogsForRange(todayStr, todayStr);
        const logs = logsRes.success ? logsRes.data : [];

        // Per-habit reminders
        for (const h of habits) {
          if (!h.reminder_time) continue;
          if (h.reminder_time.slice(0, 5) !== hhmm) continue;
          const key = `rem_v1_${todayStr}_${h.id}`;
          if (saidToday(key)) continue;
          const log = logs.find((l) => l.habit_id === h.id && l.log_date === todayStr);
          if (log && isLogCompleted(h, log)) continue;
          notify(
            bn ? `মনে আছে? ${h.name}` : `Reminder: ${h.name}`,
            bn ? 'এখনই করে ফেলুন, streak ধরে রাখুন!' : 'Do it now and keep your streak alive!'
          );
          markToday(key);
        }

        // Daily summary
        if (p.notifications.dailySummaryTime) {
          const skey = `sum_v1_${todayStr}`;
          if (!saidToday(skey) && p.notifications.dailySummaryTime === hhmm) {
            const done = habits.filter((h) => {
              const log = logs.find((l) => l.habit_id === h.id && l.log_date === todayStr);
              return log && isLogCompleted(h, log);
            }).length;
            notify(
              bn ? 'আজ কেমন গেল?' : 'How did today go?',
              bn
                ? `আজ ${done}/${habits.length} habit সম্পূর্ণ হয়েছে।`
                : `You completed ${done}/${habits.length} habits today.`
            );
            markToday(skey);
          }
        }

        // Streak-break warning (evening only)
        if (p.notifications.streakWarning && now.getHours() >= 20) {
          const wkey = `warn_v1_${todayStr}`;
          if (!saidToday(wkey)) {
            const pending = habits.filter((h) => {
              if (h.frequency_type === 'specific_days' && h.frequency_days && !h.frequency_days.includes(now.getDay())) {
                return false;
              }
              const log = logs.find((l) => l.habit_id === h.id && l.log_date === todayStr);
              return !(log && isLogCompleted(h, log));
            });
            if (pending.length > 0) {
              notify(
                bn ? 'Streak ভাঙতে বসেছে!' : 'Streak at risk!',
                bn
                  ? `${pending.map((h) => h.name).slice(0, 3).join(', ')} এখনো বাকি — ঘুমানোর আগে সেরে ফেলুন।`
                  : `${pending.map((h) => h.name).slice(0, 3).join(', ')} still pending — finish before bed.`
              );
              markToday(wkey);
            }
          }
        }
      } catch {
        // never break the app for reminders
      }
    };

    const start = setTimeout(() => {
      tick();
      timer = setInterval(tick, 60 * 1000);
    }, 5000);
    return () => {
      clearTimeout(start);
      if (timer) clearInterval(timer);
    };
  }, []);

  return <>{children}</>;
}
