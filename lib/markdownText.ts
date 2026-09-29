/**
 * Plain-text helpers for AI model output.
 *
 * Deliberately dependency-free and React-free so it can be unit-tested in plain
 * Node and reused by any surface (cards, notifications, exports) that cannot
 * render inline formatting.
 */

/**
 * Reduce Markdown to a single clean line of plain prose.
 *
 * Used where inline formatting cannot be shown (e.g. a one-line card summary).
 * Truncates on a word boundary instead of mid-word, and never leaves a dangling
 * `**` or backtick behind.
 */
export function markdownToPlainText(text: string, maxChars = 180): string {
  const flat = (text || '')
    // fenced code blocks are noise in a one-liner
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
  // Only honour the word boundary when it does not throw away most of the
  // budget (single very long token, e.g. a URL) — otherwise hard-cut.
  const base = lastSpace > maxChars * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.replace(/[\s,;:.!?-]+$/, '')}…`;
}
