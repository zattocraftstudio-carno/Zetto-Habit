import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getHabits, getHabit } from '@/actions/habits';
import { getHabitLogsByHabit } from '@/actions/habitLogs';
import { getMoods } from '@/actions/mood';
import { getPreferences } from '@/actions/preferences';
import { getRpgState } from '@/actions/rpg';
import { getAppTodayStr, formatDate, parseDate } from '@/lib/streaks';
import { TrackHabitView } from '@/components/TrackHabitView';

export default async function HabitTrackPage({
  params,
}: {
  params: { habitId: string };
}) {
  const { habitId } = params;

  const [habitRes, allHabitsRes, logsRes, prefsRes, rpgRes] = await Promise.all([
    getHabit(habitId),
    getHabits(),
    getHabitLogsByHabit(habitId),
    getPreferences(),
    getRpgState(),
  ]);

  if (!habitRes.success || !habitRes.data) {
    if (allHabitsRes.success && allHabitsRes.data.length > 0) {
      redirect(`/track/${allHabitsRes.data[0].id}`);
    }
    notFound();
  }

  const habit = habitRes.data;
  if (habit.archived) {
    // Archived habits open nowhere: not Home, not Track, not Dashboard.
    redirect('/track');
  }

  const prefs = prefsRes.success ? prefsRes.data : null;
  const todayStr = getAppTodayStr(prefs?.dayStartHour ?? 0);
  const shields = rpgRes.success && rpgRes.data ? Math.min(rpgRes.data.profile.streak_shields, 2) : 0;
  const graceDays = (prefs?.graceDaysPerMonth ?? 0) + shields;

  const allHabits = allHabitsRes.success ? allHabitsRes.data : [habit];
  const logs = logsRes.success ? logsRes.data : [];

  // Moods feed both the calendar mood dots and the day detail modal
  const earliest = logs.reduce((min, l) => (l.log_date < min ? l.log_date : min), formatDate(new Date()));
  const ref = parseDate(earliest);
  ref.setDate(ref.getDate() - 30);
  const moodsRes = await getMoods(formatDate(ref), todayStr);
  const moods = moodsRes.success ? moodsRes.data : [];

  return (
    <TrackHabitView
      habit={habit}
      allHabits={allHabits}
      logs={logs}
      moods={moods}
      todayStr={todayStr}
      graceDays={graceDays}
    />
  );
}
