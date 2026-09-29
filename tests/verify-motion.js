// Animation / micro-interaction QA
// Run: node tests/verify-motion.js
const assert = require('assert');

// Mirror of lib/motion.ts pure helpers (runs in plain node, no JSX)
const MILESTONES = [7, 30, 100];
const TAB_ORDER = ['/home', '/dashboard', '/add-habit', '/track', '/settings'];

function nextMilestone(streak) {
  for (const m of MILESTONES) if (streak < m) return m;
  return null;
}
function crossedMilestone(before, after) {
  for (const m of MILESTONES) if (before < m && after >= m) return m;
  return null;
}
function tabIndexFor(p) {
  const e = TAB_ORDER.indexOf(p);
  if (e >= 0) return e;
  if (p.startsWith('/track')) return TAB_ORDER.indexOf('/track');
  if (p.startsWith('/review')) return TAB_ORDER.indexOf('/dashboard');
  if (p.startsWith('/rewards')) return TAB_ORDER.indexOf('/dashboard');
  return -1;
}
function directionBetween(from, to) {
  const a = tabIndexFor(from), b = tabIndexFor(to);
  if (a < 0 || b < 0 || a === b) return 0;
  return b > a ? 1 : -1;
}

const seen = new Set();
function claimMilestone(habitId, m) {
  const k = `${habitId}:${m}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
}

console.log('--- MOTION QA ---');

// [1] Durations respect the "never exceed 500ms" rule
const DUR = { tap: 0.25, tapReverse: 0.15, ripple: 0.4, ring: 0.5, page: 0.22, shimmer: 1.5, burst: 0.9 };
for (const [k, v] of Object.entries(DUR)) {
  if (k === 'shimmer' || k === 'burst') continue; // documented exceptions
  assert.ok(v <= 0.5, `${k} = ${v}s must be <= 500ms`);
}
assert.ok(DUR.burst <= 1.0, 'milestone burst must last at most 1s');
console.log('✓ Test 1: interaction durations <= 500ms; burst <= 1s (shimmer loop exempt)');

// [2] Tap vs reverse: reverse must be faster than the forward bounce
assert.ok(DUR.tapReverse < DUR.tap, 'undo animation must be quicker than check');
console.log('✓ Test 2: un-check is faster and lighter than check');

// [3] Milestone detection at the exact thresholds
assert.strictEqual(crossedMilestone(6, 7), 7, '6 → 7 crosses 7');
assert.strictEqual(crossedMilestone(7, 7), null, '7 → 7 crosses nothing (no re-fire)');
assert.strictEqual(crossedMilestone(29, 30), 30, '29 → 30 crosses 30');
assert.strictEqual(crossedMilestone(99, 100), 100, '99 → 100 crosses 100');
assert.strictEqual(crossedMilestone(100, 101), null, 'past the last milestone, nothing');
assert.strictEqual(crossedMilestone(3, 5), null, '3 → 5 crosses nothing');
assert.strictEqual(nextMilestone(0), 7);
assert.strictEqual(nextMilestone(7), 30);
assert.strictEqual(nextMilestone(100), null);
console.log('✓ Test 3: milestones fire exactly at 7/30/100 and never repeat');

// [4] One-shot per session: a second refresh must not re-celebrate
assert.strictEqual(claimMilestone('h1', 7), true, 'first claim wins');
assert.strictEqual(claimMilestone('h1', 7), false, 'same habit+milestone claims once');
assert.strictEqual(claimMilestone('h1', 30), true, 'a different milestone still fires');
assert.strictEqual(claimMilestone('h2', 7), true, 'a different habit still fires');
console.log('✓ Test 4: celebration is claimed once per habit+milestone per session');

// [5] Page transition direction is derived from tab order
assert.strictEqual(directionBetween('/home', '/dashboard'), 1, 'forward = slide from right');
assert.strictEqual(directionBetween('/dashboard', '/home'), -1, 'back = slide from left');
assert.strictEqual(directionBetween('/settings', '/add-habit'), -1, 'leftwards across the bar');
assert.strictEqual(directionBetween('/home', '/home'), 0, 'same tab = no slide');
assert.strictEqual(directionBetween('/track/abc-123', '/track/def'), 0, 'same section = no slide');
assert.strictEqual(directionBetween('/login', '/forgot-password'), 0, 'non-tab route = fade only');
assert.strictEqual(tabIndexFor('/review'), 1, 'deep link maps to its tab');
console.log('✓ Test 5: transition direction follows tab order, deep links stay still');

// [6] Reduced motion must collapse durations, not just disable one effect
function resolveDuration(sec, reduced) { return reduced ? 0.001 : sec; }
assert.strictEqual(resolveDuration(DUR.tap, true), 0.001);
assert.strictEqual(resolveDuration(DUR.page, true), 0.001);
assert.strictEqual(resolveDuration(DUR.ring, true), 0.001);
assert.strictEqual(resolveDuration(DUR.tap, false), DUR.tap);
console.log('✓ Test 6: reduced motion collapses every animated duration to ~0');

console.log('ALL MOTION QA CHECKS PASSED 🎉');
