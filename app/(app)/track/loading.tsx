import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonButton, SkeletonHeading, LoadingBlock } from '@/components/ui/Skeleton';

export default function TrackOverviewLoading() {
  return (
    <LoadingBlock label="Loading habits" className="space-y-6">
      <div className="space-y-2">
        <SkeletonHeading width={180} />
        <Skeleton width={260} height={14} />
      </div>
      <Card padding="lg" className="flex flex-col items-center py-16 gap-4">
        <Skeleton circle width={64} height={64} />
        <Skeleton width={220} height={22} className="rounded-lg" />
        <Skeleton width={340} height={13} />
        <SkeletonButton width={168} height={44} delay={60} />
      </Card>
    </LoadingBlock>
  );
}
