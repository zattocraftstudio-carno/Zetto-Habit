'use client';

/**
 * Shared motion layer — "calm, not gamified-loud".
 *
 * Every duration here is well under the 500ms ceiling, and every consumer is
 * expected to gate on `useReducedMotion()` so OS-level reduced-motion users get
 * either nothing or a drastically shortened version of the effect.
 */

export const DUR = {
  tap: 0.25, // checkbox scale-bounce
  tapReverse: 0.15, // un-check: faster and quieter
  ripple: 0.4, // radial fade from the click point
  ring: 0.5, // stroke-dashoffset settle
  page: 0.22, // slide + fade between tabs
  shimmer: 1.5, // skeleton sweep loop
  burst: 0.9, // milestone particles (kept under 1s)
} as const;

export const EASE = {
  out: [0.22, 0.61, 0.36, 1] as [number, number, number, number],
  inOut: [0.4, 0, 0.2, 1] as [number, number, number, number],
  soft: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
};

/** Checkbox: 1 → 0.9 → 1.05 → 1 */
export const tapBounce = {
  scale: [1, 0.9, 1.05, 1],
  transition: { duration: DUR.tap, times: [0, 0.35, 0.7, 1], ease: EASE.out },
};

/** Un-check: same shape, faster, and deliberately understated. */
export const tapReverse = {
  scale: [1, 0.94, 1],
  transition: { duration: DUR.tapReverse, ease: EASE.out },
};

/** Particle palette — strictly the design tokens, never random hues. */
export const BURST_COLORS = [
  'var(--color-primary)',
  'var(--color-accent)',
  'var(--color-primary)',
  'var(--color-missed)',
  'var(--color-accent)',
] as const;

export const MILESTONES = [7, 30, 100] as const;

export function nextMilestone(streak: number): number | null {
  for (const m of MILESTONES) if (streak < m) return m;
  return null;
}

export function crossedMilestone(before: number, after: number): number | null {
  for (const m of MILESTONES) {
    if (before < m && after >= m) return m;
  }
  return null;
}

/**
 * One-shot celebration flags, session-scoped (PRD: never replay on refresh).
 * Keyed by habit + milestone so each pair can celebrate exactly once per session.
 */
const seen = new Set<string>();

export function claimMilestone(habitId: string, milestone: number): boolean {
  const key = `${habitId}:${milestone}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

export function resetMilestones() {
  seen.clear();
}

/** Navigation direction for direction-aware page transitions. */
export type NavDirection = 1 | -1 | 0;

const TAB_ORDER = ['/home', '/dashboard', '/add-habit', '/track', '/settings'];

export function tabIndexFor(pathname: string): number {
  const exact = TAB_ORDER.indexOf(pathname);
  if (exact >= 0) return exact;
  if (pathname.startsWith('/track')) return TAB_ORDER.indexOf('/track');
  if (pathname.startsWith('/review')) return TAB_ORDER.indexOf('/dashboard');
  if (pathname.startsWith('/rewards')) return TAB_ORDER.indexOf('/dashboard');
  return -1;
}

/**
 * Direction between two routes: 1 = moving right (forward), -1 = moving left
 * (back), 0 = not a tab move (deep link, settings sub-view, …).
 */
export function directionBetween(from: string, to: string): NavDirection {
  const a = tabIndexFor(from);
  const b = tabIndexFor(to);
  if (a < 0 || b < 0 || a === b) return 0;
  return b > a ? 1 : -1;
}

/** A module-level flag so any router.push can record intent before navigation. */
let pendingDirection: NavDirection = 0;
export function setPendingDirection(d: NavDirection) {
  pendingDirection = d;
}
export function consumePendingDirection(): NavDirection {
  const d = pendingDirection;
  pendingDirection = 0;
  return d;
}
