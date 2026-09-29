import { Card } from '@/components/ui/Card';
import {
  Skeleton,
  SkeletonHeading,
  SkeletonButton,
  SkeletonPill,
  SkeletonStatCard,
  SkeletonBarChart,
  SkeletonLineChart,
  SkeletonHeatmap,
  SkeletonDonut,
  SkeletonTable,
  SkeletonText,
  LoadingBlock,
} from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <LoadingBlock label="Loading dashboard" className="space-y-6">
      {/* Title + review/add buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonHeading width={248} />
          <Skeleton width={280} height={14} />
        </div>
        <div className="flex flex-wrap gap-2">
          <SkeletonButton width={140} height={36} />
          <SkeletonButton width={108} height={36} delay={60} />
          <SkeletonButton width={112} height={36} delay={100} />
        </div>
      </div>

      {/* Range selector + active-range readout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonPill key={i} width={i === 4 ? 88 : 74} height={30} delay={i * 40} />
          ))}
        </div>
        <Skeleton width={190} height={12} />
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonStatCard key={i} delay={i * 60} />
        ))}
      </div>

      {/* Comparison chart + patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md" className="space-y-3">
          <Skeleton width={210} height={18} className="rounded-md" />
          <Skeleton width={180} height={12} />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonPill key={i} width={72 + i * 8} height={24} delay={i * 40} />
            ))}
          </div>
          <SkeletonBarChart delay={120} />
        </Card>

        <Card padding="md" className="space-y-4">
          <Skeleton width={190} height={18} className="rounded-md" />
          <Skeleton width={150} height={12} />
          <div className="space-y-3 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton width="46%" height={13} delay={i * 50} />
                <Skeleton width={62} height={13} delay={i * 50 + 25} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Category donut + correlation insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md" className="space-y-3">
          <Skeleton width={180} height={18} className="rounded-md" />
          <Skeleton width={200} height={12} />
          <div className="pt-2">
            <SkeletonDonut delay={60} />
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <Skeleton width={200} height={18} className="rounded-md" />
          <Skeleton width={160} height={12} />
          <div className="p-3 rounded-lg bg-[var(--color-missed)]/20 border border-[var(--color-border)] space-y-2 mt-1">
            <SkeletonText lines={3} height={13} delay={60} />
          </div>
        </Card>
      </div>

      {/* AI summary card */}
      <Card padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2 flex-1">
          <Skeleton width={230} height={18} className="rounded-md" />
          <Skeleton width={190} height={12} />
        </div>
        <SkeletonButton width={132} height={34} delay={60} />
      </Card>

      {/* Insights + heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md" className="space-y-3">
          <Skeleton width={200} height={18} className="rounded-md" />
          <div className="space-y-2.5 pt-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-2">
                <Skeleton circle width={16} height={16} delay={i * 50} />
                <SkeletonText lines={1} width="72%" height={13} delay={i * 50 + 20} />
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <Skeleton width={210} height={18} className="rounded-md" />
          <Skeleton width={160} height={12} />
          <div className="pt-3 overflow-hidden">
            <SkeletonHeatmap />
          </div>
        </Card>
      </div>

      {/* Weekly / monthly charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="md" className="space-y-3">
          <Skeleton width={190} height={18} className="rounded-md" />
          <Skeleton width={220} height={12} />
          <SkeletonBarChart delay={60} />
        </Card>
        <Card padding="md" className="space-y-3">
          <Skeleton width={170} height={18} className="rounded-md" />
          <Skeleton width={200} height={12} />
          <SkeletonLineChart delay={60} />
        </Card>
      </div>

      {/* Streak leaderboard table */}
      <Card padding="md" className="space-y-3">
        <Skeleton width={200} height={18} className="rounded-md" />
        <Skeleton width={230} height={12} />
        <div className="pt-2">
          <SkeletonTable rows={5} />
        </div>
      </Card>
    </LoadingBlock>
  );
}
