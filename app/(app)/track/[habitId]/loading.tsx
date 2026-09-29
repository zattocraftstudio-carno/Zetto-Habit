import { Card } from '@/components/ui/Card';
import {
  Skeleton,
  SkeletonButton,
  SkeletonPill,
  SkeletonInput,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonHeatmap,
  LoadingBlock,
} from '@/components/ui/Skeleton';

export default function TrackLoading() {
  return (
    <LoadingBlock label="Loading habit" className="space-y-6">
      {/* Identity header: name, streaks, ring */}
      <Card padding="md" className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton width="44%" height={24} className="rounded-lg" />
          <Skeleton width="62%" height={13} />
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center px-3 py-1.5 rounded-lg bg-[var(--color-missed)]/20 space-y-1.5">
            <Skeleton width={44} height={10} />
            <Skeleton width={22} height={16} className="mx-auto" />
          </div>
          <div className="text-center px-3 py-1.5 rounded-lg bg-[var(--color-missed)]/20 space-y-1.5">
            <Skeleton width={48} height={10} />
            <Skeleton width={22} height={16} className="mx-auto" />
          </div>
        </div>
        <Skeleton circle width={60} height={60} delay={80} />
      </Card>

      {/* Habit switcher chips + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <SkeletonPill key={i} width={104 + i * 12} height={30} delay={i * 40} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <SkeletonButton width={96} height={32} />
          <SkeletonButton width={104} height={32} delay={50} />
        </div>
      </div>

      {/* View switcher + month nav */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton width={190} height={34} className="rounded-full" />
        <div className="flex items-center gap-1">
          <Skeleton circle width={30} height={30} />
          <Skeleton width={132} height={18} className="mx-1" />
          <Skeleton circle width={30} height={30} />
        </div>
      </div>

      {/* Calendar + side stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="md" className="lg:col-span-2">
          {/* weekday header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={12} className="rounded" delay={i * 25} />
            ))}
          </div>
          {/* day cells: 6 rows, wider cells like the real calendar */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton
                key={i}
                width="100%"
                height={44}
                className="!rounded-lg"
                delay={Math.floor(i / 7) * 60 + (i % 7) * 20}
              />
            ))}
          </div>
          {/* legend */}
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-center gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton width={12} height={12} className="rounded" />
                <Skeleton width={44} height={10} delay={i * 30} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card padding="md" className="space-y-3 h-full">
            <Skeleton width={150} height={14} />
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton width="52%" height={13} delay={i * 50} />
                  <Skeleton width={40} height={13} delay={i * 50 + 25} />
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
              <Skeleton width={120} height={10} />
              <div className="flex items-end gap-[2px] h-12">
                {Array.from({ length: 30 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    width="100%"
                    height={`${30 + ((i * 13) % 60)}%`}
                    className="!rounded-sm"
                    delay={i * 12}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Timeline */}
      <Card padding="md" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-2">
            <Skeleton width={150} height={18} className="rounded-md" />
            <Skeleton width={210} height={12} />
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonPill key={i} width={58} height={24} delay={i * 35} />
            ))}
          </div>
        </div>
        <div className="pt-2">
          <SkeletonTable rows={6} />
        </div>
      </Card>
    </LoadingBlock>
  );
}
