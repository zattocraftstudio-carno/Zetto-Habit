import React, { Suspense } from 'react';
import Link from 'next/link';
import { getDashboardData } from '@/actions/habitLogs';
import { getPreferences } from '@/actions/preferences';
import { getRpgState } from '@/actions/rpg';
import { getAnalytics } from '@/actions/analytics';
import { getAppTodayStr, computeHeatmapData } from '@/lib/streaks';
import { RangeKey } from '@/lib/analytics';
import { DashboardCharts } from '@/components/charts/DashboardCharts';
import { StreakRankingTable } from '@/components/StreakRankingTable';
import { InsightsCard } from '@/components/InsightsCard';
import { RangeSelector } from '@/components/dashboard/RangeSelector';
import { StatCards } from '@/components/dashboard/StatCards';
import { ComparisonChart } from '@/components/dashboard/ComparisonChart';
import { PatternCard } from '@/components/dashboard/PatternCard';
import { CategoryDonut } from '@/components/dashboard/CategoryDonut';
import { CorrelationCard } from '@/components/dashboard/CorrelationCard';
import { ReviewSummaryCard } from '@/components/dashboard/ReviewSummaryCard';
import { DashboardExport } from '@/components/dashboard/DashboardExport';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@/components/icons';

const VALID: RangeKey[] = ['week', 'month', 'quarter', 'year', 'custom'];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const rangeParam = (searchParams.range || 'month') as RangeKey;
  const range: RangeKey = VALID.includes(rangeParam) ? rangeParam : 'month';

  const [prefsRes, rpgRes] = await Promise.all([getPreferences(), getRpgState()]);
  const prefs = prefsRes.success ? prefsRes.data : null;
  const shields = rpgRes.success && rpgRes.data ? Math.min(rpgRes.data.profile.streak_shields, 2) : 0;
  const todayStr = getAppTodayStr(prefs?.dayStartHour ?? 0);
  const bn = (prefs?.language ?? 'bn') === 'bn';
  const graceDays = (prefs?.graceDaysPerMonth ?? 0) + shields;

  const [dataRes, analyticsRes] = await Promise.all([
    getDashboardData(todayStr, graceDays),
    getAnalytics(range, searchParams.from, searchParams.to, todayStr, graceDays),
  ]);

  const habits = dataRes.success ? dataRes.data.habits : [];
  const logs = dataRes.success ? dataRes.data.logs : [];
  const rankedHabits = dataRes.success ? dataRes.data.rankedHabits : [];
  const weeklyStats = dataRes.success ? dataRes.data.weeklyStats : [];
  const monthlyStats = dataRes.success ? dataRes.data.monthlyStats : [];
  const heatmapData = computeHeatmapData(habits, logs, 16, todayStr);

  const analytics = analyticsRes.success ? analyticsRes.data : null;
  const hasHabits = habits.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            {bn ? 'অগ্রগতি ড্যাশবোর্ড' : 'Progress Dashboard'}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            {bn ? 'গ্রাফ, heatmap ও streak' : 'Charts, heatmaps and streaks'}
          </p>
        </div>

        {hasHabits && (
          <div className="flex flex-wrap items-center gap-2">
            <Suspense fallback={null}>
              <DashboardExport data={analytics} />
            </Suspense>
            <Link href="/review">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <span>📝</span>
                <span>{bn ? 'সাপ্তাহিক রিভিউ' : 'Weekly Review'}</span>
              </Button>
            </Link>
            <Link href="/add-habit">
              <Button variant="secondary" size="sm" className="gap-1.5">
                <PlusIcon size={16} />
                <span>{bn ? 'যোগ করুন' : 'Add Habit'}</span>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {!hasHabits ? (
        <Card padding="lg" className="text-center py-16 flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            {bn ? 'দেখানোর মতো ডেটা নেই' : 'No Data to Display'}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mb-6">
            {bn
              ? 'Habit যোগ করে দৈনিক log করুন — চার্ট আর heatmap ভরে উঠবে।'
              : 'Add a habit and log daily to fill the charts and heatmap.'}
          </p>
          <Link href="/add-habit">
            <Button variant="primary" size="md">
              {bn ? 'প্রথম habit যোগ করুন' : 'Add Your First Habit'}
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          {/* Range selector drives every range-aware section below */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Suspense fallback={null}>
              <RangeSelector initial={range} />
            </Suspense>
            {analytics && (
              <p className="text-[11px] text-[var(--color-text-secondary)] tabular-nums">
                {analytics.range.start} → {analytics.range.end} ({analytics.range.days}d)
              </p>
            )}
          </div>

          {/* 1) Overview stat cards */}
          <StatCards data={analytics ? analytics.overview : null} />

          {/* 2) Range-aware: comparison + patterns + category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ComparisonChart data={analytics} />
            <PatternCard data={analytics} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryDonut data={analytics} />
            <CorrelationCard data={analytics} />
          </div>

          {/* 3) AI summary (own loading state, never blocks the rest) */}
          <ReviewSummaryCard data={analytics} />

          {/* 4) Existing fixed-range charts (kept) */}
          <InsightsCard habits={rankedHabits} logs={logs} todayStr={todayStr} />

          <DashboardCharts
            weeklyStats={weeklyStats}
            monthlyStats={monthlyStats}
            heatmapData={heatmapData}
            habits={rankedHabits}
          />

          <StreakRankingTable habits={rankedHabits} />
        </>
      )}
    </div>
  );
}
