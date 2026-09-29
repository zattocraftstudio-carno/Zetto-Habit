'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { WeeklyBarChart, WeeklyStat } from '@/components/charts/WeeklyBarChart';
import { MonthlyLineChart, MonthlyStat } from '@/components/charts/MonthlyLineChart';
import { Heatmap, HeatmapDay } from '@/components/charts/Heatmap';
import { SuccessDonut, RankedHabit } from '@/components/charts/SuccessDonut';
import { usePrefs } from '@/components/PrefsProvider';

interface DashboardChartsProps {
  weeklyStats: WeeklyStat[];
  monthlyStats: MonthlyStat[];
  heatmapData: HeatmapDay[];
  habits: RankedHabit[];
}

export function DashboardCharts({
  weeklyStats,
  monthlyStats,
  heatmapData,
  habits,
 }: DashboardChartsProps) {
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  return (
    <div className="space-y-6">
      {/* Heatmap Section */}
      <Card padding="md">
        <div className="mb-4 pb-2 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {bn ? 'Habit ধারাবাহিকতা Heatmap' : 'Habit Consistency Heatmap'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn ? 'গত ১৬ সপ্তাহের দৈনিক completion' : 'Daily habit completion across the past 16 weeks'}
          </p>
        </div>
        <Heatmap data={heatmapData} />
      </Card>

      {/* Charts Grid: Weekly Bar + Monthly Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {bn ? 'সাপ্তাহিক Completion' : 'Weekly Completion'}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {bn ? 'গত ৭ দিনে প্রতিদিনের হার' : 'Completion percentage per day over the last 7 days'}
            </p>
          </div>
          <WeeklyBarChart data={weeklyStats} />
        </Card>

        <Card padding="md">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              {bn ? 'মাসিক Trend' : 'Monthly Trend'}
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {bn ? 'চলমান ৩০ দিনের ধারা' : 'Rolling 30-day consistency trajectory'}
            </p>
          </div>
          <MonthlyLineChart data={monthlyStats} />
        </Card>
      </div>

      {/* Per-Habit Success Donut Grid */}
      <Card padding="md">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            {bn ? 'প্রতি-Habit সাফল্য (৩০ দিন)' : 'Per-Habit Success Rates (30 Days)'}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn ? 'প্রতিটা habit এর লক্ষ্য-হার' : 'Target completion rates across individual habits'}
          </p>
        </div>
        <SuccessDonut habits={habits} />
      </Card>
    </div>
  );
}
