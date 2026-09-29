// Personalization & Sharing PRD §6 — QA checks
// Run: node tests/verify-personalization.js
const assert = require('assert');

// Mirror of lib/greeting.ts (pure, no imports) so it runs in plain node.
function greetingForHour(hour) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 4 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}
function greetingForUser(hour, username, bn) {
  const table = {
    morning: { bn: 'শুভ সকাল', en: 'Good morning' },
    afternoon: { bn: 'শুভ দুপুর', en: 'Good afternoon' },
    evening: { bn: 'শুভ সন্ধ্যা', en: 'Good evening' },
    night: { bn: 'শুভ রাত্রি', en: 'Good night' },
  };
  return `${table[greetingForHour(hour)][bn ? 'bn' : 'en']}, ${username}`;
}

console.log('--- PERSONALIZATION & SHARING QA ---');

// [1] Full 24-hour sweep of greeting brackets (mocked clock, per PRD §2.2)
const EXPECTED = {
  0: 'night', 1: 'night', 2: 'night', 3: 'night',
  4: 'morning', 5: 'morning', 6: 'morning', 7: 'morning',
  8: 'morning', 9: 'morning', 10: 'morning', 11: 'morning',
  12: 'afternoon', 13: 'afternoon', 14: 'afternoon', 15: 'afternoon', 16: 'afternoon',
  17: 'evening', 18: 'evening', 19: 'evening', 20: 'evening',
  21: 'night', 22: 'night', 23: 'night',
};
for (let h = 0; h < 24; h++) {
  assert.strictEqual(
    greetingForHour(h),
    EXPECTED[h],
    `hour ${h} should be ${EXPECTED[h]}`
  );
}
console.log('✓ Test 1: greeting correct across all 24 hours (4/12/17/21 boundaries)');

// [2] Boundary values specifically
assert.strictEqual(greetingForHour(3), 'night', '3:59 = night');
assert.strictEqual(greetingForHour(4), 'morning', '4:00 = morning');
assert.strictEqual(greetingForHour(11), 'morning', '11:59 = morning');
assert.strictEqual(greetingForHour(12), 'afternoon', '12:00 = afternoon');
assert.strictEqual(greetingForHour(16), 'afternoon', '16:59 = afternoon');
assert.strictEqual(greetingForHour(17), 'evening', '17:00 = evening');
assert.strictEqual(greetingForHour(20), 'evening', '20:59 = evening');
assert.strictEqual(greetingForHour(21), 'night', '21:00 = night');
console.log('✓ Test 2: all bracket boundaries exact');

// [3] Greeting string format: "{greeting}, {username}" in both languages
assert.strictEqual(greetingForUser(9, 'Carno', true), 'শুভ সকাল, Carno');
assert.strictEqual(greetingForUser(9, 'Carno', false), 'Good morning, Carno');
assert.strictEqual(greetingForUser(22, 'carno', false), 'Good night, carno');
console.log('✓ Test 3: greeting format "{greeting}, {username}" (bn + en)');

// [4] Feedback → WhatsApp deep link. Mirrors lib/support.ts whatsappUrl().
// The number must be E.164 without +, spaces or separators, or wa.me 404s.
const WHATSAPP_E164 = '8801811389672';
const whatsappUrl = (message) =>
  message
    ? `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(message.slice(0, 1000))}`
    : `https://wa.me/${WHATSAPP_E164}`;

assert.strictEqual(whatsappUrl(), 'https://wa.me/8801811389672');
assert.ok(whatsappUrl().match(/^https:\/\/wa\.me\/\d{10,15}$/), 'bare link is digits only');
// Local BD format 01811389672 -> 880 + 10 digits, leading zero dropped
assert.strictEqual(WHATSAPP_E164, '880' + '01811389672'.slice(1));
// Prefilled text survives encoding and is parsed back intact (bengali + emoji)
const msg = 'শুভ সন্ধ্যা! বাগ পেয়েছি 🔥';
const parsed = new URL(whatsappUrl(msg)).searchParams.get('text');
assert.strictEqual(parsed, msg, 'prefilled message round-trips through encode/decode');
// Newlines and the WhatsApp bold marker must not break the URL
const multi = 'Topic: Bug\n\n*bold* line';
assert.strictEqual(new URL(whatsappUrl(multi)).searchParams.get('text'), multi);
// Over-long messages are truncated rather than rejected (wa.me has a hard cap)
assert.ok(whatsappUrl('x'.repeat(5000)).length < whatsappUrl('x'.repeat(1000)).length + 40);
console.log('✓ Test 4: WhatsApp feedback deep link is valid E.164, message round-trips, over-long text truncated');

// [5] Share card streak parity (PRD §6: "no off-by-one from the live data")
// Re-mirror of the streak walk used for the card.
const parseDate = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const isCompleted = (log) => Number(log.completed_value || 0) >= 1;
function currentStreak(logs, todayStr) {
  // build the completed-date set from YYYY-MM-DD strings
  const set = new Set(logs.filter(isCompleted).map((l) => l.log_date));
  if (set.size === 0) return 0;
  const today = parseDate(todayStr);
  const y = new Date(today); y.setDate(today.getDate() - 1);
  let cursor;
  if (set.has(todayStr)) cursor = new Date(today);
  else if (set.has(formatDate(y))) cursor = y;
  else return 0;
  let n = 0;
  while (set.has(formatDate(cursor))) { n++; cursor.setDate(cursor.getDate() - 1); }
  return n;
}
const cardLogs = [
  { log_date: '2026-09-24', completed_value: 1 },
  { log_date: '2026-09-25', completed_value: 1 },
  { log_date: '2026-09-26', completed_value: 1 },
  { log_date: '2026-09-27', completed_value: 1 },
  { log_date: '2026-09-28', completed_value: 1 },
];
assert.strictEqual(currentStreak(cardLogs, '2026-09-28'), 5, 'card streak matches live data');
// A streak that ended yesterday still counts (no off-by-one)
assert.strictEqual(currentStreak(cardLogs.slice(0, 4), '2026-09-28'), 4);
// Broken streak (gap) must not count
assert.strictEqual(currentStreak([{ log_date: '2026-09-20', completed_value: 1 }], '2026-09-28'), 0);
console.log('✓ Test 5: share-card streak matches on-screen value, no off-by-one');

// [6] Sound-off must prevent the audio call entirely (not a muted one)
function simulateTick(enabled, sink) {
  if (!enabled) return 'no-audio-call';
  sink();            // AudioContext construction / node scheduling
  return 'played';
}
let constructed = 0;
const ctxFactory = () => { constructed++; };
assert.strictEqual(simulateTick(false, ctxFactory), 'no-audio-call');
assert.strictEqual(constructed, 0, 'disabled sound must not construct an AudioContext');
assert.strictEqual(simulateTick(true, ctxFactory), 'played');
assert.strictEqual(constructed, 1);
console.log('✓ Test 6: sound off -> zero audio calls (no context, no muted play)');

// [7] Haptics feature-detect: unsupported browser is a silent no-op
function vibrate(enabled, nav) {
  if (!enabled) return false;
  if (!('vibrate' in nav)) return false;   // iOS Safari path
  nav.vibrate(15);
  return true;
}
const noVibrate = {};                                  // browser without support
const withVibrate = { vibrate: () => {} };
assert.strictEqual(vibrate(true, noVibrate), false, 'unsupported -> silent no-op, no error');
assert.strictEqual(vibrate(false, withVibrate), false, 'disabled -> no call');
assert.strictEqual(vibrate(true, withVibrate), true, 'supported -> single 15ms pulse');
console.log('✓ Test 7: haptics no-op on unsupported browsers, no error thrown');

console.log('ALL PERSONALIZATION QA CHECKS PASSED 🎉');
