import { Card } from '@/components/ui/Card';
import {
  Skeleton,
  SkeletonHeading,
  SkeletonButton,
  SkeletonStatCard,
  SkeletonText,
  SkeletonTable,
  LoadingBlock,
} from '@/components/ui/Skeleton';

export default function ReviewLoading() {
  return (
    <LoadingBlock label="Loading review" className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <SkeletonHeading width={200} />
          <Skeleton width={230} height={14} />
        </div>
        <SkeletonButton width={120} height={36} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <SkeletonStatCard key={i} delay={i * 60} />
        ))}
      </div>

      <Card padding="md" className="space-y-3">
        <Skeleton width={170} height={18} className="rounded-md" />
        <SkeletonTable rows={5} />
      </Card>

      <Card padding="md" className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton width={190} height={18} className="rounded-md" />
            <Skeleton width={250} height={12} />
          </div>
          <SkeletonButton width={132} height={34} />
        </div>
        <SkeletonText lines={3} height={13} delay={60} />
      </Card>
    </LoadingBlock>
  );
}
