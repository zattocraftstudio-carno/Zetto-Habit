'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePrefs } from '@/components/PrefsProvider';
import { useToast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { openMysteryBox } from '@/actions/rpg';
import type { RpgState } from '@/actions/rpg';

const LEVEL_ACCENTS = ['#2E7D6B', '#0E7D8A', '#C4554D', '#8B5CF6', '#B8860B'];

export function RpgHud({ rpg }: { rpg: RpgState | null }) {
  const { prefs, lang } = usePrefs();
  const bn = lang === 'bn';
  const { toast } = useToast();
  const router = useRouter();
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxResult, setBoxResult] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  // Level theme: auto accent follows RPG level unless user picked a custom one
  useEffect(() => {
    if (!rpg) return;
    document.body.setAttribute('data-rpg-level', String(rpg.profile.level));
    if (!prefs.accent) {
      const accent = LEVEL_ACCENTS[Math.min(rpg.profile.level, 5) - 1] || LEVEL_ACCENTS[0];
      document.documentElement.style.setProperty('--color-primary', accent);
    }
    return () => {
      document.body.removeAttribute('data-rpg-level');
    };
  }, [rpg, prefs.accent]);

  if (!rpg) return null;
  const p = rpg.profile;

  const handleOpenBox = async () => {
    setOpening(true);
    try {
      const res = await openMysteryBox();
      if (res.success) {
        setBoxResult(bn ? res.data.labelBn : res.data.label);
        setBoxOpen(true);
        router.refresh();
      } else toast(res.error, 'error');
    } catch {
      toast('Failed to open box', 'error');
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <Card padding="md" className="rpg-banner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center text-2xl shadow">
              {rpg.levelEmoji}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
                Level {p.level} — {bn ? rpg.levelNameBn : rpg.levelName}
              </p>
              <p className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                {p.xp_total} XP
                {rpg.nextLevelXp !== null && (
                  <span className="font-normal text-[var(--color-text-secondary)]"> / {rpg.nextLevelXp}</span>
                )}
              </p>
              <div className="w-40 sm:w-52 h-2 rounded bg-[var(--color-missed)]/40 overflow-hidden mt-1">
                <div
                  className="h-full bg-[var(--color-primary)] transition-all duration-700"
                  style={{ width: `${rpg.progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-accent)]/15 text-[#D97724] dark:text-[#F4A259]" title="Coins">
              🪙 {p.coins_total}
            </span>
            {p.streak_shields > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)]" title="Streak shields">
                🛡️ {p.streak_shields}
              </span>
            )}
            {p.mystery_boxes > 0 && (
              <button
                onClick={handleOpenBox}
                disabled={opening}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-primary)] text-white hover:opacity-90 animate-streak-bump"
              >
                🎁 {p.mystery_boxes} {bn ? 'খুলুন' : 'Open'}
              </button>
            )}
            <Link href="/rewards">
              <Button variant="secondary" size="sm">{bn ? 'রিওয়ার্ড' : 'Rewards'}</Button>
            </Link>
          </div>
        </div>

        {rpg.quests.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
              ⚔️ {bn ? 'আজকের কোয়েস্ট' : "Today's Quests"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rpg.quests.slice(0, 4).map((q) => {
                const done = q.status === 'done';
                const pct = Math.min(100, Math.round((q.progress / Math.max(1, q.target)) * 100));
                return (
                  <div
                    key={q.id}
                    className={`p-2.5 rounded border text-xs ${done ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate text-[var(--color-text-primary)]">
                        {done ? '✓ ' : ''}{q.title}
                      </span>
                      <span className="shrink-0 font-bold text-[var(--color-accent)] tabular-nums">+{q.xp_reward} XP</span>
                    </div>
                    {!done && q.target > 1 && (
                      <div className="h-1.5 rounded bg-[var(--color-missed)]/40 overflow-hidden mt-1.5">
                        <div className="h-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Modal isOpen={boxOpen} onClose={() => setBoxOpen(false)} title={bn ? 'মিস্ট্রি বক্স!' : 'Mystery Box!'}>
        <div className="text-center py-6">
          <div className="text-6xl mb-4 animate-habit-pop">🎉</div>
          <p className="text-xl font-bold text-[var(--color-text-primary)]">{boxResult}</p>
          <div className="mt-6">
            <Button variant="primary" size="md" onClick={() => setBoxOpen(false)}>
              {bn ? 'দারুণ!' : 'Awesome!'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
