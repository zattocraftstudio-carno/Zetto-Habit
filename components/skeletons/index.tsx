import { Card } from '@/components/ui/Card';
import {
  Skeleton,
  SkeletonButton,
  SkeletonInput,
  SkeletonHeatmap,
} from '@/components/ui/Skeleton';

/** Year-view heatmap placeholder (shared by the Track year tab). */
export function YearSkeleton() {
  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={180} height={18} className="rounded-md" />
          <Skeleton width={140} height={12} />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton width={28} height={28} className="rounded" />
          <Skeleton width={56} height={16} className="mx-1" />
          <Skeleton width={28} height={28} className="rounded" />
        </div>
      </div>
      <div className="pt-2">
        <SkeletonHeatmap weeks={32} />
      </div>
    </Card>
  );
}

/** Add / edit habit form placeholder. */
export function FormSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton width={220} height={28} className="rounded-lg" />
        <Skeleton width={300} height={14} />
      </div>
      <Card padding="lg" className="space-y-6">
        <div className="space-y-1.5">
          <Skeleton width={110} height={13} />
          <SkeletonInput />
        </div>
        <div className="space-y-1.5">
          <Skeleton width={90} height={13} />
          <SkeletonInput />
        </div>
        <div className="space-y-2">
          <Skeleton width={100} height={13} />
          <div className="grid grid-cols-3 gap-2.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={62} className="rounded-lg" delay={i * 40} />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton width={150} height={13} />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} width="100%" height={58} className="rounded-lg" delay={i * 40} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--color-border)]">
          <Skeleton width={180} height={13} />
          <Skeleton width={180} height={13} />
          <Skeleton width={180} height={13} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
          <SkeletonButton width={96} height={42} />
          <SkeletonButton width={124} height={42} delay={50} />
        </div>
      </Card>
    </div>
  );
}

/** Settings shell: title, section tabs, and the panel body. */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton width={200} height={28} className="rounded-lg" />
        <Skeleton width={320} height={14} />
      </div>
      <Skeleton width="100%" height={46} className="rounded-lg" />
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="hidden sm:flex sm:flex-col gap-1.5 w-52 shrink-0">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton
              key={i}
              width="100%"
              height={40}
              className="rounded-lg"
              delay={i * 30}
            />
          ))}
        </div>
        <div className="flex-1 min-w-0 w-full space-y-6">
          {[0, 1].map((c) => (
            <Card key={c} padding="md" className="space-y-4">
              <div className="space-y-2">
                <Skeleton width={160} height={18} className="rounded-md" />
                <Skeleton width={280} height={12} />
              </div>
              {[0, 1, 2].map((r) => (
                <div
                  key={r}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-[var(--color-border)] last:border-0"
                >
                  <div className="space-y-2">
                    <Skeleton width={`${34 + r * 6}%`} height={13} />
                    <Skeleton width={`${52 - r * 5}%`} height={10} />
                  </div>
                  <Skeleton width={120} height={32} className="rounded-lg" delay={r * 40} />
                </div>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
