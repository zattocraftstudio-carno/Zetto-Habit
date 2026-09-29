'use client';

import React from 'react';

/**
 * Minimal, dependency-free Markdown renderer for AI coach output.
 *
 * Extracted from `AiChatPanel` so every surface that shows model text renders it
 * the same way. Previously the Home "coach tip" card dumped the raw string,
 * which leaked literal `##` and `**` markers into the UI.
 *
 * Safety: this builds React elements — there is no `dangerouslySetInnerHTML`
 * anywhere, so model output can never inject markup or scripts. Link hrefs are
 * restricted to `http(s)` by the regex below.
 */

// Inline spans: bold, italic, strikethrough, code, links.
export function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const re =
    /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;
  const parts = text.split(re);
  return parts.map((p, i) => {
    if (!p) return <React.Fragment key={`${keyPrefix}-${i}`} />;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-[var(--color-text-primary)]">
          {p.slice(2, -2)}
        </strong>
      );
    }
    if (
      (p.startsWith('*') && p.endsWith('*') && p.length > 2) ||
      (p.startsWith('_') && p.endsWith('_') && p.length > 2)
    ) {
      return <em key={`${keyPrefix}-${i}`}>{p.slice(1, -1)}</em>;
    }
    if (p.startsWith('~~') && p.endsWith('~~') && p.length > 4) {
      return (
        <s key={`${keyPrefix}-${i}`} className="opacity-70">
          {p.slice(2, -2)}
        </s>
      );
    }
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) {
      return (
        <code
          key={`${keyPrefix}-${i}`}
          className="px-1 py-0.5 rounded text-xs bg-[var(--color-missed)]/40 text-[var(--color-text-primary)] font-mono"
        >
          {p.slice(1, -1)}
        </code>
      );
    }
    const link = p.match(/^\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primary)] underline hover:opacity-80"
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{p}</React.Fragment>;
  });
}

export function renderTable(lines: string[], keyPrefix: string): React.ReactNode {
  const cells = (row: string) =>
    row
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
  const header = cells(lines[0]);
  const body = lines.slice(2).map(cells);
  return (
    <div key={keyPrefix} className="overflow-x-auto -mx-1 px-1 my-1">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th
                key={i}
                className="text-left font-semibold px-2 py-1.5 border-b-2 border-[var(--color-primary)]/40 text-[var(--color-text-primary)] whitespace-nowrap"
              >
                {renderInline(h, `${keyPrefix}-h${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-b border-[var(--color-border)]/70 last:border-0">
              {row.map((c, i) => (
                <td key={i} className="px-2 py-1.5 text-[var(--color-text-primary)] align-top">
                  {renderInline(c, `${keyPrefix}-${r}-${i}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Block-level renderer. Understands: tables, fenced code, headings (##/###),
 * quotes, rules, bullets (dash / star / bullet char), numbered lists,
 * and paragraphs.
 */
export function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={i} className="h-1.5" />);
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      nodes.push(
        <pre
          key={`code-${i}`}
          className="my-1 p-2.5 rounded text-xs font-mono overflow-x-auto bg-[var(--color-missed)]/25 border border-[var(--color-border)] text-[var(--color-text-primary)] whitespace-pre-wrap"
        >
          {codeLines.join('\n')}
        </pre>
      );
      continue;
    }

    // Table (| header | + | --- | separator)
    if (
      trimmed.startsWith('|') &&
      i + 1 < lines.length &&
      /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim()) &&
      lines[i + 1].includes('-')
    ) {
      const tableLines = [lines[i], lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      nodes.push(renderTable(tableLines, `t-${i}`));
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      nodes.push(
        <blockquote
          key={`q-${i}`}
          className="my-1 pl-2.5 py-1 border-l-2 border-[var(--color-accent)] text-[var(--color-text-secondary)] italic text-[13px]"
        >
          {quoteLines.map((q, qi) => (
            <p key={qi}>{renderInline(q, `q-${i}-${qi}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      nodes.push(<hr key={i} className="my-2 border-[var(--color-border)]" />);
      i++;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      nodes.push(
        <p key={i} className="font-semibold text-[var(--color-text-primary)] mt-1">
          {renderInline(trimmed.slice(4), `h-${i}`)}
        </p>
      );
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      nodes.push(
        <p key={i} className="font-bold text-[var(--color-text-primary)] mt-1.5 text-[15px]">
          {renderInline(trimmed.slice(3), `h-${i}`)}
        </p>
      );
      i++;
      continue;
    }
    const bullet = trimmed.match(/^([-*•])\s+(.*)/);
    if (bullet) {
      nodes.push(
        <div key={i} className="flex gap-1.5 pl-1">
          <span className="text-[var(--color-primary)] font-bold">•</span>
          <span className="flex-1">{renderInline(bullet[2], `b-${i}`)}</span>
        </div>
      );
      i++;
      continue;
    }
    const numbered = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    if (numbered) {
      nodes.push(
        <div key={i} className="flex gap-1.5 pl-1">
          <span className="text-[var(--color-primary)] font-bold tabular-nums">{numbered[1]}.</span>
          <span className="flex-1">{renderInline(numbered[2], `n-${i}`)}</span>
        </div>
      );
      i++;
      continue;
    }
    nodes.push(
      <p key={i} className="mt-0.5 first:mt-0">
        {renderInline(line, `p-${i}`)}
      </p>
    );
    i++;
  }

  return nodes;
}

/** Convenience wrapper for rendering model text anywhere in the tree. */
export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  return <div className={className}>{renderMarkdown(text)}</div>;
}
