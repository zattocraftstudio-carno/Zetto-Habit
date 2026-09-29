import { Card } from '@/components/ui/Card';
import {
  Skeleton,
  SkeletonHeading,
  SkeletonButton,
  SkeletonHabitRow,
  SkeletonRing,
  SkeletonText,
  LoadingBlock,
} from '@/components/ui/Skeleton';

/**
 * Mirrors the real Home layout 1:1 — same grid, same row heights, same control
 * sizes — so when data lands the swap produces no visible reflow.
 */
export default function HomeLoading() {
  return (
    <LoadingBlock label="Loading today's habits" className="space-y-6">
      {/* Header: greeting + date, and the two action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Skeleton width="62%" height={26} className="rounded-lg" />
          <Skeleton width="42%" height={14} />
        </div>
        <div className="flex gap-2">
          <SkeletonButton width={92} height={36} delay={60} />
          <SkeletonButton width={112} height={36} delay={100} />
        </div>
      </div>

      {/* AI tip card */}
      <Card padding="md" className="flex items-center gap-3">
        <Skeleton circle width={36} height={36} />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton width="22%" height={11} />
          <SkeletonText lines={2} width="88%" height={13} />
        </div>
        <SkeletonButton width={96} height={28} delay={80} />
      </Card>

      {/* Main column: search + category chips, then habit rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Skeleton width="100%" height={44} className="rounded-lg sm:flex-1" />
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width={62} height={26} className="rounded-full" delay={i * 40} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Skeleton width={180} height={20} className="rounded-md" />
          </div>

          {/* One time-group heading, then 3 rows */}
          <div className="space-y-3">
            <Skeleton width={86} height={13} />
            {[0, 1, 2].map((i) => (
              <SkeletonHabitRow key={i} delay={i * 70} />
            ))}
          </div>
        </div>

        {/* Sidebar: completion ring + summary card */}
        <div className="space-y-4">
          <Card padding="md" className="flex flex-col items-center">
            <Skeleton width={140} height={16} />
            <div className="my-5">
              <SkeletonRing size={140} delay={60} />
            </div>
            <Skeleton width="62%" height={12} />
          </Card>

          <Card padding="md" className="space-y-3">
            <Skeleton width="58%" height={14} />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <Skeleton width="46%" height={12} delay={i * 50} />
                <Skeleton width={26} height={14} delay={i * 50 + 20} />
              </div>
            ))}
          </Card>

          {/* Mood card */}
          <Card padding="md" className="space-y-3">
            <Skeleton width="64%" height={14} />
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} circle width={36} height={36} delay={i * 40} />
              ))}
            </div>
            <Skeleton width="100%" height={36} className="rounded-lg" delay={90} />
          </Card>
        </div>
      </div>
    </LoadingBlock>
  );
}
