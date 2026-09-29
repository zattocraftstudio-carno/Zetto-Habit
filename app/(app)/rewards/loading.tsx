import { Card } from '@/components/ui/Card';
import {
  Skeleton,
  SkeletonButton,
  SkeletonPill,
  SkeletonStatCard,
  SkeletonDonut,
  SkeletonTable,
  LoadingBlock,
} from '@/components/ui/Skeleton';

export default function RewardsLoading() {
  return (
    <LoadingBlock label="Loading rewards" className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Skeleton width={200} height={30} className="rounded-lg" />
        <SkeletonPill width={104} height={32} />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonPill key={i} width={92 + i * 8} height={30} delay={i * 40} />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="md" className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Skeleton circle width={40} height={40} delay={i * 40} />
              <div className="flex-1 space-y-2">
                <Skeleton width="62%" height={14} delay={i * 40} />
                <Skeleton width="82%" height={11} delay={i * 40 + 30} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Skeleton width={64} height={14} />
              <SkeletonButton width={78} height={32} delay={i * 40 + 60} />
            </div>
          </Card>
        ))}
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <Skeleton circle width={80} height={80} />
          <Skeleton width={180} height={18} className="rounded-md" />
          <Skeleton width={140} height={12} />
          <SkeletonButton width={168} height={42} delay={60} />
        </div>
      </Card>

      <Card padding="md" className="space-y-3">
        <Skeleton width={190} height={18} className="rounded-md" />
        <SkeletonTable rows={6} />
      </Card>
    </LoadingBlock>
  );
}
