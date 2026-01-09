'use client';

import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-shimmer rounded-md bg-muted', className)}
      {...props}
    />
  );
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6', className)}>
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-6', className)}>
      <Skeleton className="h-4 w-1/4 mb-4" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

function SkeletonMetric({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 text-center', className)}>
      <Skeleton className="h-3 w-16 mx-auto mb-2" />
      <Skeleton className="h-12 w-24 mx-auto mb-1" />
      <Skeleton className="h-3 w-12 mx-auto" />
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonChart, SkeletonMetric };
