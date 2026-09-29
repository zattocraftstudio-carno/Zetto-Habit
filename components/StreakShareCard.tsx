'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Habit, HabitLog } from '@/types';
import {
  computeCurrentStreakWithGrace,
  computeLongestStreak,
  isLogCompleted,
  formatDate,
  parseDate,
} from '@/lib/streaks';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/PrefsProvider';
import { DownloadIcon } from '@/components/icons';

const SIZE = 1080;

/**
 * Streak share card (PRD §5).
 *
 * Built as a self-contained SVG string (fixed light background so the card
 * still reads correctly when reposted inside white social chrome), rasterised
 * to PNG with the Canvas API. No server round-trip: the user's stats never
 * leave the device.
 */
export function StreakShareCard({
  habit,
  logs,
  todayStr,
  graceDays,
}: {
  habit: Habit;
  logs: HabitLog[];
  todayStr: string;
  graceDays: number;
}) {
  const { toast } = useToast();
  const { lang } = usePrefs();
  const bn = lang === 'bn';
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);

  const current = computeCurrentStreakWithGrace(habit, logs, todayStr, graceDays);
  const longest = computeLongestStreak(habit, logs);

  // 30-day strip for the compact visual
  const strip = useMemo(() => {
    const byDate = new Map<string, HabitLog>();
    for (const l of logs) byDate.set(l.log_date, l);
    const out: { date: string; done: boolean; pct: number }[] = [];
    const today = parseDate(todayStr);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = formatDate(d);
      const log = byDate.get(ds);
      const done = log ? isLogCompleted(habit, log) : false;
      const pct =
        habit.goal_type === 'quantity' && log
          ? Math.min(
              100,
              Math.round((Number(log.completed_value || 0) / Math.max(1, Number(habit.target_value || 1))) * 100)
            )
          : done
            ? 100
            : 0;
      out.push({ date: ds, done, pct });
    }
    return out;
  }, [logs, todayStr, habit]);

  const svgMarkup = useMemo(() => {
    const accent = habit.color || '#2E7D6B';
    const cols = 15;
    const rows = 2;
    const cell = 54;
    const gap = 8;
    const startX = 80;
    const startY = 726;

    const cells = strip
      .map((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cell + gap);
        const y = startY + row * (cell + gap);
        const fill = c.done ? accent : '#E7E5DE';
        const op = c.pct > 0 && !c.done ? 0.55 : 1;
        return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="12" fill="${fill}" opacity="${op}"/>`;
      })
      .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
  <rect width="${SIZE}" height="${SIZE}" fill="#FAFAF7"/>
  <rect x="0" y="0" width="${SIZE}" height="18" fill="${accent}"/>

  <circle cx="112" cy="150" r="58" fill="${accent}"/>
  <circle cx="112" cy="150" r="30" fill="#FAFAF7" opacity="0.92"/>

  <text x="200" y="138" font-size="52" font-weight="700" fill="#1C2620">${escapeXml(
      habit.name
    )}</text>
  <text x="200" y="182" font-size="28" fill="#6B7A72">${
      habit.goal_type === 'quantity'
        ? `${bn ? 'লক্ষ্য' : 'Target'}: ${habit.target_value} ${habit.unit_label || ''}`
        : bn ? 'দৈনিক টিক' : 'Daily checkmark'
    }</text>

  <g>
    <text x="80" y="330" font-size="150" font-weight="800" fill="${accent}">${current}</text>
    <text x="80" y="392" font-size="34" fill="#1C2620">${bn ? 'দিনের স্ট্রিক' : 'day streak'}</text>
    <text x="80" y="430" font-size="24" fill="#6B7A72">${bn ? 'ধারাবাহিক' : 'consecutive'} 🔥</text>
  </g>

  <line x1="600" y1="270" x2="600" y2="440" stroke="#D9D6CE" stroke-width="2"/>

  <g>
    <text x="660" y="330" font-size="110" font-weight="800" fill="#1C2620">${longest}</text>
    <text x="660" y="392" font-size="34" fill="#1C2620">${bn ? 'সেরা স্ট্রিক' : 'best streak'}</text>
    <text x="660" y="430" font-size="24" fill="#6B7A72">${bn ? 'সর্বোচ্চ' : 'all time'}</text>
  </g>

  <text x="80" y="690" font-size="26" fill="#6B7A72">${bn ? 'গত ৩০ দিন' : 'Last 30 days'}</text>
  ${cells}

  <line x1="80" y1="900" x2="1000" y2="900" stroke="#E4E2DC" stroke-width="2"/>
  <text x="80" y="960" font-size="30" font-weight="700" fill="#1C2620">Habit Tracker</text>
  <text x="80" y="1000" font-size="24" fill="#6B7A72">${bn ? 'দৈনিক অভ্যাস ট্র্যাকার' : 'Daily habit tracker'}</text>
  <text x="1000" y="1000" font-size="22" fill="#6B7A72" text-anchor="end">by Zettocraft Studio</text>
</svg>`;
  }, [habit, current, longest, strip, bn]);

  const toBlob = async (): Promise<Blob | null> => {
    const node = svgRef.current?.querySelector('svg');
    if (!node) return null;
    const xml = new XMLSerializer().serializeToString(node);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        canvas.toBlob((b) => resolve(b), 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  const fileName = `habit-streak-${habit.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;

  const download = async () => {
    setBusy(true);
    const blob = await toBlob();
    setBusy(false);
    if (!blob) {
      toast(bn ? 'ইমেজ তৈরি হয়নি' : 'Could not generate image', 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(bn ? 'ডাউনলোড হয়েছে' : 'Downloaded', 'success');
  };

  const share = async () => {
    setBusy(true);
    const blob = await toBlob();
    setBusy(false);
    if (!blob) {
      toast(bn ? 'ইমেজ তৈরি হয়নি' : 'Could not generate image', 'error');
      return;
    }
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${habit.name} — ${current} ${bn ? 'দিনের স্ট্রিক' : 'day streak'}`,
          text: `${bn ? 'আমার' : 'My'} ${habit.name} ${bn ? 'স্ট্রিক' : 'streak'}: ${current} ${bn ? 'দিন' : 'days'} 🔥`,
        });
        return;
      } catch {
        // user cancelled — fall through to download
      }
    }
    await download();
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <DownloadIcon size={15} />
        <span>{bn ? 'স্ট্রিক কার্ড' : 'Share card'}</span>
      </Button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={bn ? 'স্ট্রিক কার্ড শেয়ার' : 'Share streak card'}
      >
        <div className="space-y-4">
          <div
            ref={svgRef}
            className="w-full rounded-lg overflow-hidden border border-[var(--color-border)]"
            // Preview only; the exported file is rendered from the SVG markup
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
          <p className="text-xs text-[var(--color-text-secondary)]">
            {bn
              ? '১০৮০×১০৮০ PNG — সম্পূর্ণ আপনার ডিভাইসেই তৈরি হয়, কোথাও আপলোড হয় না।'
              : '1080×1080 PNG — generated entirely on your device, nothing is uploaded.'}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={busy}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="secondary" size="sm" onClick={download} isLoading={busy} className="gap-1.5">
              <DownloadIcon size={15} />
              <span>{bn ? 'ডাউনলোড' : 'Download'}</span>
            </Button>
            <Button variant="primary" size="sm" onClick={share} isLoading={busy}>
              {bn ? 'শেয়ার' : 'Share'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
