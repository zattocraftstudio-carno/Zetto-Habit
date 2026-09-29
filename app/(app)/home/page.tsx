import React from 'react';
import { getHabits } from '@/actions/habits';
import { getHabitLogsForRange } from '@/actions/habitLogs';
import { getMoods } from '@/actions/mood';
import { getPreferences } from '@/actions/preferences';
import { getSession } from '@/lib/session';
import { getRpgState } from '@/actions/rpg';
import { getAppTodayStr, parseDate, formatDate } from '@/lib/streaks';
import { HomeClient } from '@/components/HomeClient';

export default async function HomePage() {
  const [prefsRes, habitsRes, rpgRes, session] = await Promise.all([
    getPreferences(),
    getHabits(),
    getRpgState(),
    getSession(),
  ]);
  const prefs = prefsRes.success ? prefsRes.data : null;
  const rpg = rpgRes.success ? rpgRes.data : null;
  // Streak shields add passive protection: each shield = +1 grace day (max +2)
  const shields = rpg ? Math.min(rpg.profile.streak_shields, 2) : 0;
  const graceDays = (prefs?.graceDaysPerMonth ?? 0) + shields;

  const habits = habitsRes.success ? habitsRes.data : [];

  const today = new Date();
  const todayStr = getAppTodayStr(prefs?.dayStartHour ?? 0, today);

  // Fetch logs for the past 60 days to compute streaks accurately
  const ref = parseDate(todayStr);
  const sixtyDaysAgo = new Date(ref);
  sixtyDaysAgo.setDate(ref.getDate() - 60);
  const logsRes = await getHabitLogsForRange(formatDate(sixtyDaysAgo), todayStr);
  const allLogs = logsRes.success ? logsRes.data : [];

  const weekAgo = new Date(ref);
  weekAgo.setDate(ref.getDate() - 6);
  const moodsRes = await getMoods(formatDate(weekAgo), todayStr);
  const moods = moodsRes.success ? moodsRes.data : [];

  return <HomeClient
      habits={habits}
      allLogs={allLogs}
      todayStr={todayStr}
      graceDays={graceDays}
      moods={moods}
      rpg={rpg}
      username={session?.username || ''}
    />;
}
