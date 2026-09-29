import React from 'react';

/**
 * Skeleton system — "calm, precise".
 *
 * Two layers:
 *  1. `Skeleton` — the primitive. Its original API (className / width / height /
 *     circle) is preserved exactly, so all existing call sites keep working.
 *  2. Compound helpers below that mirror the *real* component geometry, so the
 *     swap from skeleton → content causes no layout shift.
 *
 * The shimmer is pure CSS (a translated gradient overlay), which means it runs on
 * the compositor and costs nothing on the main thread.
 */

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  /** Set false for very dense grids — a static block beats 100+ animating nodes. */
  shimmer?: boolean;
  /** Subtle stagger, in ms. Use sparingly so it stays calm. */
  delay?: number;
  style?: React.CSSProperties;
}

export function Skeleton({
  className = '',
  width,
  height,
  circle = false,
  shimmer = true,
  delay = 0,
  style,
}: SkeletonProps) {
  const box: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
    animationDelay: delay ? `${delay}ms` : undefined,
    ...style,
  };

  return (
    <div
      style={box}
      className={`skeleton ${circle ? 'rounded-full' : 'rounded-md'} ${className}`}
      aria-hidden="true"
      data-skeleton={shimmer ? 'shimmer' : 'static'}
    >
      {shimmer && <span className="skeleton-shimmer" />}
    </div>
  );
}

/* ------------------------------------------------------------------ text */

export function SkeletonText({
  lines = 1,
  lastWidth = '60%',
  width = '100%',
  height = 14,
  className = '',
  delay = 0,
}: {
  lines?: number;
  lastWidth?: string;
  width?: string;
  height?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 && lines > 1 ? lastWidth : width}
          height={height}
          delay={delay + i * 40}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- blocks */

export function SkeletonHeading({ width = 220, delay = 0 }: { width?: number | string; delay?: number }) {
  return <Skeleton width={width} height={28} className="rounded-lg" delay={delay} />;
}

export function SkeletonButton({ width = 120, height = 36, delay = 0 }: { width?: number; height?: number; delay?: number }) {
  return <Skeleton width={width} height={height} className="rounded-lg" delay={delay} />;
}

export function SkeletonAvatar({ size = 56, delay = 0 }: { size?: number; delay?: number }) {
  return <Skeleton circle width={size} height={size} delay={delay} />;
}

export function SkeletonPill({ width = 64, height = 24, delay = 0 }: { width?: number; height?: number; delay?: number }) {
  return <Skeleton width={width} height={height} className="rounded-full" delay={delay} />;
}

export function SkeletonInput({ height = 44, delay = 0 }: { height?: number; delay?: number }) {
  return <Skeleton width="100%" height={height} className="rounded-lg" delay={delay} />;
}

/** Matches CompletionRing's footprint so the swap does not jump. */
export function SkeletonRing({ size = 140, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }} aria-hidden="true">
      <Skeleton circle width={size} height={size} delay={delay} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <Skeleton width={size * 0.3} height={size * 0.12} className="rounded" />
        <Skeleton width={size * 0.2} height={size * 0.06} className="rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------- composed blocks */

/** One row of the Home checklist: icon dot, two text lines, trailing control. */
export function SkeletonHabitRow({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="flex items-center justify-between gap-3 p-4 rounded border border-[var(--color-border)]"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <Skeleton circle width={40} height={40} delay={delay} />
        <div className="flex flex-col gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Skeleton width={`${38 + ((delay / 40) % 3) * 8}%`} height={16} delay={delay} />
            <SkeletonPill width={44} height={18} delay={delay + 40} />
          </div>
          <Skeleton width="28%" height={12} delay={delay + 60} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Skeleton circle width={28} height={28} delay={delay + 80} />
        <Skeleton circle width={36} height={36} delay={delay + 100} />
      </div>
    </div>
  );
}

/** Dashboard overview tile: label line, big number, sub line. */
export function SkeletonStatCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="p-3.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-card-bg)]"
      aria-hidden="true"
    >
      <Skeleton width="52%" height={12} delay={delay} />
      <div className="mt-2.5">
        <Skeleton width="42%" height={26} className="rounded-md" delay={delay + 50} />
      </div>
      <div className="mt-1.5">
        <Skeleton width="34%" height={10} delay={delay + 90} />
      </div>
    </div>
  );
}

/** Bar chart with a baseline and varied bar heights, like the real thing. */
export function SkeletonBarChart({ height = 256, bars = 7, delay = 0 }: { height?: number; bars?: number; delay?: number }) {
  const pattern = [62, 48, 78, 40, 70, 55, 85];
  return (
    <div className="flex items-end gap-2 pt-4" style={{ height }} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end gap-2">
          <Skeleton
            width="100%"
            height={`${pattern[i % pattern.length]}%`}
            className="rounded-t-md"
            delay={delay + i * 30}
          />
        </div>
      ))}
    </div>
  );
}

/** Line chart placeholder: grid lines + a soft filled area. */
export function SkeletonLineChart({ height = 256, delay = 0 }: { height?: number; delay?: number }) {
  return (
    <div className="relative" style={{ height }} aria-hidden="true">
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} width="100%" height={1} shimmer={false} className="rounded-none opacity-40" />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-1/4 flex items-end gap-1">
        {[40, 58, 46, 72, 62, 80].map((h, i) => (
          <Skeleton key={i} width="100%" height={h} className="rounded-t-md" delay={delay + i * 30} />
        ))}
      </div>
    </div>
  );
}

/** GitHub-style heatmap grid. Static cells on purpose: 100+ animating nodes is wasteful. */
export function SkeletonHeatmap({ weeks = 16, delay = 0 }: { weeks?: number; delay?: number }) {
  const tones = [0.14, 0.26, 0.4, 0.55, 0.32, 0.68, 0.22];
  return (
    <div className="flex gap-1.5 overflow-hidden" aria-hidden="true">
      {Array.from({ length: weeks }).map((_, w) => (
        <div key={w} className="flex flex-col gap-1.5">
          {Array.from({ length: 7 }).map((_, d) => (
            <Skeleton
              key={d}
              width={14}
              height={14}
              shimmer={false}
              delay={delay + w * 12 + d * 4}
              className="!opacity-60"
              style={{ opacity: tones[(w + d) % tones.length] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Donut placeholder. */
export function SkeletonDonut({ size = 176, delay = 0 }: { size?: number; delay?: number }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4" aria-hidden="true">
      <Skeleton circle width={size} height={size} delay={delay} className="shrink-0" />
      <div className="flex-1 w-full space-y-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton width={10} height={10} className="rounded-sm" delay={delay + i * 40} />
            <Skeleton width={`${44 - i * 5}%`} height={12} delay={delay + i * 40} />
            <Skeleton width={52} height={12} className="ml-auto" delay={delay + i * 40} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Data table: header row + body rows with a bar, a pill and trailing text. */
export function SkeletonTable({ rows = 5, delay = 0 }: { rows?: number; delay?: number }) {
  return (
    <div aria-hidden="true">
      <div className="flex gap-4 pb-2.5 border-b border-[var(--color-border)]">
        {['18%', '12%', '34%', '12%'].map((w, i) => (
          <Skeleton key={i} width={w} height={11} delay={delay + i * 30} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-3 border-b border-[var(--color-border)] last:border-0">
          <Skeleton width={30} height={12} delay={delay + r * 50} />
          <SkeletonPill width={62} height={20} delay={delay + r * 50 + 30} />
          <Skeleton width="40%" height={12} delay={delay + r * 50 + 40} />
          <Skeleton circle width={16} height={16} className="ml-auto" delay={delay + r * 50 + 60} />
        </div>
      ))}
    </div>
  );
}

/**
 * Page-level wrapper: announces loading to assistive tech while the shimmer
 * blocks stay purely decorative.
 */
export function LoadingBlock({
  children,
  label = 'Loading',
  className = '',
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}
