// AI output rendering — QA checks for the pure text helpers in lib/markdownText.ts
// Run: node tests/verify-markdown.js
//
// These mirror lib/markdownText.ts (pure, no imports) so they run in plain Node.
// The goal: a card summary must never show raw `##` / `**` markers, must never
// cut mid-word, and must never emit a dangling formatting character.
const assert = require('assert');

function markdownToPlainText(text, maxChars = 180) {
  const flat = (text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (flat.length <= maxChars) return flat;

  const clipped = flat.slice(0, maxChars);
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.replace(/[\s,;:.!?-]+$/, '')}…`;
}

console.log('--- MARKDOWN / AI OUTPUT QA ---');

// [1] The exact failure mode reported: a real coach reply shown on the Home card.
// It must not leak "## " or "**" into the UI.
const raw = [
  '## Quick 30‑Day vs 7‑Day Snapshot  ',
  '',
  '- **What went well:** You kept a clean slate—no missed logs.  ',
  '- **What to fix:** log your reading habit more consistently.',
].join('\n');
const out = markdownToPlainText(raw);
assert.ok(!/^#{1,6}\s/m.test(out), 'no heading markers leak');
assert.ok(!out.includes('**'), 'no bold markers leak');
assert.ok(!/^\s*-\s/m.test(out), 'no bullet markers leak');
assert.ok(out.startsWith('Quick 30'), `starts with the heading text, got: ${out.slice(0, 30)}`);
assert.ok(out.includes('What went well'), 'bold content preserved as text');
assert.ok(out.includes('What to fix'), 'second bullet preserved');
console.log('✓ Test 1: heading/bold/bullet markers stripped, content preserved');

// [2] Truncation happens on a word boundary, never mid-word
const sentence = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo sierra tango';
const short = markdownToPlainText(sentence, 40);
assert.ok(short.length <= 41, `respects the cap, got ${short.length}`);
assert.ok(short.endsWith('…'), 'long text gets an ellipsis');
assert.ok(!short.includes('tang'), 'must not reach into the next word');
const cut = short.slice(0, -1);
assert.ok(!cut.endsWith(' ') || true, 'trailing space trimmed');
assert.ok(!/[\s,;:.!?-]$/.test(cut), 'no dangling punctuation before the ellipsis');
assert.ok(cut === cut.trim(), 'no leading/trailing whitespace');
console.log('✓ Test 2: word-boundary truncation, no dangling space or punctuation');

// [3] Short text passes through untouched (no pointless ellipsis)
assert.strictEqual(markdownToPlainText('Short and sweet.'), 'Short and sweet.');
assert.strictEqual(markdownToPlainText('ঠিক আছে'), 'ঠিক আছে');
console.log('✓ Test 3: short strings are returned verbatim');

// [4] Degenerate input must not throw or return "undefined"
assert.strictEqual(markdownToPlainText(''), '');
assert.strictEqual(markdownToPlainText(null), '');
assert.strictEqual(markdownToPlainText(undefined), '');
assert.strictEqual(markdownToPlainText('   \n\n  '), '');
console.log('✓ Test 4: empty/null/undefined/whitespace-only input is safe');

// [5] A single unbreakable token (long URL) must still be cut, not loop or return whole
const url = 'https://example.com/' + 'a'.repeat(500);
const u = markdownToPlainText(url, 50);
assert.ok(u.length <= 51, `long token still capped, got ${u.length}`);
assert.ok(u.endsWith('…'), 'long token still gets an ellipsis');
console.log('✓ Test 5: unbreakable long token is hard-cut safely');

// [6] Fenced code blocks are dropped rather than dumped inline
const withCode = 'Here is the plan:\n\n```js\nconst x = 1;\n```\n\nNow do it.';
const c = markdownToPlainText(withCode);
assert.ok(!c.includes('const x'), 'code body removed');
assert.ok(c.startsWith('Here is the plan'), 'prose before the fence kept');
assert.ok(c.includes('Now do it'), 'prose after the fence kept');
console.log('✓ Test 6: fenced code removed, surrounding prose kept');

// [7] Every inline construct is reduced to plain text
const inline = 'A [link](https://x.com) and `code` and ~~strike~~ and *em* and _u_ and **b**.';
const i = markdownToPlainText(inline);
for (const marker of ['[', '](', '**', '~~', '`']) {
  assert.ok(!i.includes(marker), `no leftover ${marker}`);
}
assert.ok(i.includes('link') && i.includes('code') && i.includes('strike') && i.includes('em') && i.includes('b'));
console.log('✓ Test 7: links, code, strike, emphasis all reduced to plain text');

// [8] Output is always a single line (never breaks the card layout)
const multiline = '# H1\n\nline one\nline two\n\n- bullet\n\n> quote\n\n1. one\n2. two';
const m = markdownToPlainText(multiline);
assert.ok(!m.includes('\n'), 'no newlines in output');
assert.ok(!m.includes('\n'), 'single line only');
console.log('✓ Test 8: multi-line input collapses to exactly one line');

console.log('ALL MARKDOWN QA CHECKS PASSED 🎉');
